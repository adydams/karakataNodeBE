const { sequelize, Order, OrderItem, Cart, CartItem, Product, User, Payment, ProductImage, Address, OrderItemFulfillment, ProductDiscount, Discount, SystemSetting, Shipment, ShipmentEvent, Store, Inventory, StorePickupStation, Category } = require("../models");
const Hub = require("../models/hubModel");
const { Op } = require("sequelize");
const PaymentService = require("./paymentServices");
const LogisticsService = require("./logisticsService");
const InventoryService = require("./inventoryServices");
const NotificationService = require("./notificationService");
const DiscountService = require("./DiscountServices");
const SourcingService = require("./SourcingService");
const WalletService = require("./walletServices");
const shippingManager = require("./shippingManager");
const auditService = require("./auditService");
const emailService = require("./emailService");
const { calculateCurrentPrice } = require("../utils/priceHelper");

class OrderServices {

  /**
   * Calculates shipping quotes with platform markup.
   * Called by the frontend to show shipping options to the customer.
   */
  async getShippingQuote(params) {
    const setting = await SystemSetting.findOne();
    const markupRate = (setting?.shippingMarkupPercent || 0) / 100;

    // 1. Calculate total weight of the package
    const cart = await Cart.findOne({
      where: { userId: params.userId },
      include: [{
        model: CartItem,
        as: "items",
        include: [{ model: Product, as: "product" }]
      }],
    });

    if (!cart || !cart.items.length) throw new Error("Cart is empty");
    const totalWeight = cart.items.reduce((sum, item) => sum + (item.product?.weightKg || 0) * item.quantity, 0);

    // 2. Get Address coordinates
    const address = await Address.findOne({ where: { id: params.receiverAddressId } });
    if (!address) throw new Error("Receiver address not found");

    // For origin, we use a default hub or the first station associated with products
    // In a real scenario, this would be the most optimal station.
    const origin = await this._getInternalShippingOrigin(cart.items.map(item => item.productId));

    const destination = {
      latitude: parseFloat(address.latitude),
      longitude: parseFloat(address.longitude),
    };

    // 3. Get quotes from all providers via the Manager
    const quotes = await shippingManager.getAllQuotes(origin, destination, totalWeight);

    // 4. Apply markup and format for frontend
    return {
      couriers: quotes.map(q => {
        const isExternal = q.provider !== 'internal';
        const rawFee = q.price;
        const markupAmount = isExternal ? parseFloat((rawFee * markupRate).toFixed(2)) : 0;
        const finalFee = parseFloat((rawFee + markupAmount).toFixed(2));

        return {
          ...q,
          rawFee,
          markupAmount,
          fee: finalFee,
          displayFee: finalFee,
        };
      }),
    };
  }

  /**
   * Server-side checkout quote: mirrors the checkout pricing pipeline
   * (product discounts, discount codes, fetch rates, VAT) without
   * reserving stock or creating an order.
   */
  async getCheckoutQuote(userId, {
    shippingAddressId,
    shippingMethod,
    chosenHubId,
    discountCode,
    courierFee,
  }) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    const cart = await Cart.findOne({ where: { userId, isDeleted: false } });
    if (!cart) throw new Error("Cart is empty");
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{
        model: Product,
        as: "product",
        include: [{ model: ProductDiscount, as: "discounts" }],
      }],
    });
    if (cartItems.length === 0) throw new Error("Cart is empty");

    const normalizedShippingMethod = String(shippingMethod).toLowerCase() === "shipping" ? "SHIPPING" : "PICKUP";

    let productTotal = 0;
    const items = [];
    for (const item of cartItems) {
      if (!item.product) throw new Error(`Product not found for cart item ${item.id}`);
      const { finalPrice } = await calculateCurrentPrice(item.product, item.quantity);
      const subtotal = item.quantity * finalPrice;
      productTotal += subtotal;
      items.push({
        productId: item.productId,
        productName: item.product.name,
        unitPrice: finalPrice,
        quantity: item.quantity,
        subtotal,
        logisticsCategoryId: item.product.logisticsCategoryId,
        product: item.product,
      });
    }

    let address = null;
    let pickupHub = null;
    let shippingFee = 0;
    if (normalizedShippingMethod === "SHIPPING") {
      if (!shippingAddressId) throw new Error("Shipping address is required");
      address = await Address.findOne({
        where: { id: shippingAddressId, userId, isDeleted: false },
      });
      if (!address) throw new Error("Shipping address not found");
    } else {
      if (!chosenHubId) throw new Error("Pickup hub selection is required");
      pickupHub = await Hub.findOne({ where: { id: chosenHubId, isActive: true } });
      if (!pickupHub) throw new Error("Selected pickup hub was not found or is inactive");
    }

    // Discount (same best-deal logic as checkout)
    let appliedDiscount = null;
    let globalDiscountAmount = 0;
    let manualDiscount = null;
    let manualAmount = 0;
    if (discountCode) {
      try {
        manualDiscount = await DiscountService.validate(discountCode, productTotal);
        const result = DiscountService.apply(manualDiscount, productTotal);
        manualAmount = result.discountAmount;
      } catch (discountErr) {
        console.error(`Quote manual discount error: ${discountErr.message}`);
      }
    }
    const autoDiscount = await DiscountService.findActiveAutomaticDiscount(productTotal);
    let autoAmount = 0;
    if (autoDiscount) {
      const result = DiscountService.apply(autoDiscount, productTotal);
      autoAmount = result.discountAmount;
    }
    if (manualAmount > autoAmount) {
      appliedDiscount = manualDiscount;
      globalDiscountAmount = manualAmount;
    } else {
      appliedDiscount = autoDiscount;
      globalDiscountAmount = autoAmount;
    }

    // Stock validation via sourcing. Fetch rates are no longer billed to the
    // customer: external couriers charge last-mile only, and the internal
    // fleet fee already covers the station-to-doorstep transport.
    for (const item of items) {
      const preference = normalizedShippingMethod === "PICKUP"
        ? { chosenHub: pickupHub }
        : { receiverAddress: address };
      try {
        await SourcingService.allocateStock(
          item.productId,
          item.quantity,
          preference
        );
      } catch (err) {
        throw new Error(`Product ${item.productName} is out of stock. Please remove it from your cart to proceed.`);
      }
    }
    if (normalizedShippingMethod === "PICKUP") {
      // Pickup fee: configurable percentage of the fleet delivery price.
      shippingFee = await this._getPickupFee(pickupHub, items);
    } else {
      // The courier fee comes from the client's selected courier (verified
      // server-side at checkout). External: courier charges only. Internal:
      // the fleet quote already includes the station-to-doorstep leg.
      const parsedCourierFee = Number(courierFee);
      shippingFee = Number.isFinite(parsedCourierFee) && parsedCourierFee > 0 ? parsedCourierFee : 0;
    }

    const subtotalWithShipping = productTotal - globalDiscountAmount + shippingFee;
    const setting = await SystemSetting.findOne();
    const vatPercentage = setting?.vatPercentage || 0;
    const vatAmount = parseFloat((subtotalWithShipping * (vatPercentage / 100)).toFixed(2));
    const finalGrandTotal = parseFloat((subtotalWithShipping + vatAmount).toFixed(2));

    return {
      itemsSubtotal: parseFloat(productTotal.toFixed(2)),
      discountAmount: parseFloat(globalDiscountAmount.toFixed(2)),
      discountCode: appliedDiscount?.code || null,
      discountLabel: appliedDiscount?.title || null,
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      vatPercentage: Number(vatPercentage),
      vatAmount,
      totalAmount: finalGrandTotal,
    };
  }

  /**
   * Pickup fee: a configurable percentage of the internal fleet delivery
   * price (station -> hub), since pickup orders still require the platform
   * to move goods to the pickup point. Returns 0 when coordinates are
   * unavailable (pickup remains free rather than failing checkout).
   *
   * Items with fulfillmentMethod HUB_DROPOFF are already sitting at the hub
   * (the store owner dropped them off), so no station->hub leg is charged.
   */
  async _getPickupFee(pickupHub, items) {
    try {
      const setting = await SystemSetting.findOne();
      const percent = Number(setting?.pickupFeePercent ?? 0);
      if (!(percent > 0)) return 0;

      // Only charge the station->hub leg for items riders must collect.
      const riderItems = items.filter((it) => (it.product?.fulfillmentMethod || "RIDER_PICKUP") !== "HUB_DROPOFF");
      if (riderItems.length === 0) return 0;

      const origin = await this._getInternalShippingOrigin(riderItems.map((it) => it.productId));
      const destination = {
        latitude: Number(pickupHub.latitude),
        longitude: Number(pickupHub.longitude),
      };
      const totalWeight = riderItems.reduce((sum, it) => sum + (it.product?.weightKg || 0) * it.quantity, 0);
      const fullDeliveryPrice = (await shippingManager.getProvider("internal").getQuote(origin, destination, totalWeight)).price;
      return parseFloat((fullDeliveryPrice * (percent / 100)).toFixed(2));
    } catch (err) {
      // Coordinates missing etc. — pickup stays free instead of blocking checkout.
      console.warn(`[Pickup Fee] Skipped: ${err.message}`);
      return 0;
    }
  }

  async _getInternalShippingOrigin(productIds) {
    // Prefer stations that actually have coordinates so a single unpinned
    // test station can't disable internal fleet pricing.
    const inventories = await Inventory.findAll({
      where: { productId: { [Op.in]: productIds }, isDeleted: false },
      include: [{
        model: StorePickupStation,
        as: "pickupStation",
        where: { isDeleted: false },
        required: true,
      }],
      order: [["createdAt", "ASC"]],
    });
    const withCoords = inventories.find(
      (inv) =>
        inv.pickupStation?.latitude != null &&
        inv.pickupStation?.longitude != null &&
        Number.isFinite(Number(inv.pickupStation.latitude)) &&
        Number.isFinite(Number(inv.pickupStation.longitude))
    );
    const chosen = withCoords || inventories[0];
    const latitude = Number(chosen?.pickupStation?.latitude);
    const longitude = Number(chosen?.pickupStation?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Internal shipping is unavailable because no pickup station has coordinates");
    }
    return { latitude, longitude, stationId: chosen.pickupStation.id };
  }

  /**
   * Internal helper — creates the Order row + OrderItems + Fulfillments.
   * Always called inside an existing transaction.
   */
  async _createOrderWithItems(userId, {
    items,
    totalAmount,
    shippingAddressId,
    shippingSnapshot,
    phone,
    email,
    notes,
    gateway,
    shippingMethod,
    chosenHubId,
    logisticsRequestToken,
    logisticsServiceCode,
    logisticsCourierId,
    shippingFee,
    discountCode,
    discountAmount,
    discountId,
    vatAmount,
    allocationsMap, // { productId: [ { pickupStationId, quantity } ] }
  }, transaction) {
    const order = await Order.create({
      userId,
      totalAmount,
      shippingAddressId: shippingAddressId || null,
      shippingSnapshot: shippingSnapshot || null,
      phone,
      email,
      notes,
      gateway,
      shippingMethod,
      pickupHubId: shippingMethod === "PICKUP" ? chosenHubId : null,
      logisticsRequestToken,
      logisticsServiceCode,
      logisticsCourierId,
      shippingFee: shippingFee || 0,
      vatAmount: vatAmount || 0,
      discountId: discountId || null,
      discountAmount: discountAmount || 0,
      status: "PENDING",
    }, { transaction });

    const ownerNotifications = new Map();
    for (const item of items) {
      const approvalSettings = await SystemSetting.findOne({ transaction });
      const approvalHours = Math.max(1, Number(approvalSettings?.orderItemApprovalWindowHours) || 24);
      const orderItem = await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        productDiscountId: item.appliedDiscountId,
        approvalStatus: "pending",
        approvalDeadline: new Date(Date.now() + approvalHours * 60 * 60 * 1000),
      }, { transaction });

      const productAllocations = allocationsMap[item.productId] || [];
      if (productAllocations.length === 1) {
        await orderItem.update({ pickupStationId: productAllocations[0].pickupStationId }, { transaction });
      }

      const fulfillments = productAllocations.map(alloc => ({
        orderItemId: orderItem.id,
        pickupStationId: alloc.pickupStationId,
        quantity: alloc.quantity
      }));
      await OrderItemFulfillment.bulkCreate(fulfillments, { transaction });
      const product = await Product.findByPk(item.productId, {
        attributes: ["id", "name", "storeId"],
        include: [{ model: Store, as: "store", attributes: ["ownerUserId"] }],
        transaction,
      });
      if (product?.store?.ownerUserId) {
        const ownerId = product.store.ownerUserId;
        if (!ownerNotifications.has(ownerId)) ownerNotifications.set(ownerId, []);
        ownerNotifications.get(ownerId).push({
          orderItemId: orderItem.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          approvalHours,
        });
      }
    }

    return { order, ownerNotifications };
  }

  async getMyOrders(userId) {
    const setting = await SystemSetting.findOne();
    const returnWindowDays = setting?.returnWindowDays || 5;

    const orders = await Order.findAll({
      where: { userId },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              include: [
                { model: ProductImage, as: "images" },
                { model: Category, as: "category", attributes: ["id", "name"] }
              ]
            }
          ],
        },
        {
          model: User,
          as: "user",
        },
        {
          model: Shipment,
          as: "shipments",
          where: { isDeleted: false },
          required: false,
          include: [{ model: ShipmentEvent, as: "events" }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return orders.map(order => {
      const shipment = order.shipments?.[0];
      let isReturnable = false;

      if (shipment && shipment.status === "delivered") {
        const deliveredEvent = shipment.events?.find(e => e.status === "DELIVERED" || e.status === "delivered");
        const deliveryDate = deliveredEvent ? new Date(deliveredEvent.createdAt) : new Date(shipment.updatedAt);

        const now = new Date();
        const diffTime = Math.abs(now - deliveryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= returnWindowDays) {
          isReturnable = true;
        }
      }

      return {
        ...order.toJSON(),
        isReturnable,
      };
    });
  }

  async getAdminOrders({ userId, role, limit = 10, offset = 0, search = "", status = "ALL", startDate = null, endDate = null }) {
    const conditions = [];

    if (role === "Admin") {
      // Store admins are linked to their store via stores.ownerUserId
      // (users have no storeId column).
      const admin = await User.findByPk(userId);
      if (!admin) throw new Error("Admin not found");
      const ownedStore = await Store.findOne({
        where: { ownerUserId: admin.id, isDeleted: false },
        attributes: ["id"],
      });
      if (!ownedStore) {
        throw new Error("Admin is not linked to any store");
      }

      conditions.push({
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT oi.\`orderId\` FROM \`orderitems\` AS oi
            JOIN \`products\` AS p ON oi.\`productId\` = p.id
            WHERE p.\`storeId\` = '${ownedStore.id}'
          )`)
        }
      });
    }

    if (status !== "ALL") {
      conditions.push({
        [Op.or]: [
          { status: status },
          { logisticsStatus: status }
        ]
      });
    }

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        dateRange[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange[Op.lte] = end;
      }
      conditions.push({ createdAt: dateRange });
    }

    if (search) {
      conditions.push({
        [Op.or]: [
          { id: { [Op.like]: `%${search}%` } },
          {
            userId: {
              [Op.in]: sequelize.literal(`(
                SELECT id FROM \`users\`
                WHERE name LIKE '%${search}%' OR email LIKE '%${search}%'
              )`)
            }
          }
        ]
      });
    }

    const { count, rows } = await Order.findAndCountAll({
      where: conditions.length > 0 ? { [Op.and]: conditions } : {},
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "phone"]
        },
        {
          model: OrderItem,
          as: "items",
          attributes: ["id", "quantity", "price"],
          include: [
            {
              model: Product,
              as: "product",
              include: [
                { model: Store, as: "store", attributes: ["name"] },
                // separate:true keeps images out of the main JOIN chain;
                // a nested hasMany JOIN inside a subQuery'd findAndCountAll
                // breaks MySQL's ON-clause resolution ("items.productId").
                { model: ProductImage, as: "images", attributes: ["url"], separate: true }
              ]
            }
          ]
        }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return {
      total: count,
      orders: rows,
      totalPages: Math.ceil(count / limit)
    };
  }

  async getOrderSummary() {
    const stats = {};

    // 1. Status-based counts
    const statusCounts = await Order.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        "status"
      ],
      group: ["status"],
      raw: true
    });

    statusCounts.forEach(s => {
      stats[s.status] = parseInt(s.count);
    });

    // 2. Logistics-based counts
    const logisticsCounts = await Order.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        "logisticsStatus"
      ],
      group: ["logisticsStatus"],
      raw: true
    });

    logisticsCounts.forEach(s => {
      stats[s.logisticsStatus] = parseInt(s.count);
    });

    // 3. Special: Payment Refund (Check WalletTransactions for REFUND types)
    const refundCount = await sequelize.models.WalletTransaction.count({
      where: { type: 'REFUND_REVERSAL' }
    });
    stats['REFUNDED'] = refundCount;

    return stats;
  }

  async checkout(userId, {
    shippingAddressId,
    phone,
    notes,
    gateway,
    email,
    shippingMethod, // 'shipping' or 'pickup'
    chosenHubId, // required if shippingMethod === 'pickup'
    requestToken,
    serviceCode,
    courierId,
    shippingProvider, // 'internal' or 'shipbubble'
    discountCode,
  }) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    // ── PHASE 1: CART PROCESSING (Needed for weight/pricing) ──────────────────
    const cart = await Cart.findOne({ where: { userId, isDeleted: false } });
    if (!cart) throw new Error("Cart is empty");
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{
        model: Product,
        as: "product",
        include: [{ model: ProductDiscount, as: "discounts" }],
      }],
    });
    if (cartItems.length === 0) throw new Error("Cart is empty");

    let productTotal = 0;
    const items = [];
    const cartSnapshot = cartItems.map(({ id, productId, quantity }) => ({
      id,
      productId,
      quantity: Number(quantity),
    }));
    for (const item of cartItems) {
      if (!item.product) throw new Error(`Product not found for cart item ${item.id}`);
      const { finalPrice, appliedDiscountId } = await calculateCurrentPrice(item.product, item.quantity);
      const subtotal = item.quantity * finalPrice;
      productTotal += subtotal;
      items.push({
        productId:   item.productId,
        productName: item.product.name,
        unitPrice:   finalPrice,
        quantity:    item.quantity,
        subtotal,
        appliedDiscountId,
        logisticsCategoryId: item.product.logisticsCategoryId,
        product: item.product,
      });
    }

    // ── PHASE 2: SHIPPING VERIFICATION ──────────────────
    let address = null;
    let shippingSnapshot = null;
    let shippingFee = 0;
    let pickupHub = null;
    const normalizedShippingMethod = String(shippingMethod).toLowerCase() === "shipping" ? "SHIPPING" : "PICKUP";

    if (normalizedShippingMethod === "SHIPPING") {
      if (!shippingAddressId) throw new Error("Shipping address is required");

      address = await Address.findOne({
        where: { id: shippingAddressId, userId, isDeleted: false },
      });
      if (!address) throw new Error("Shipping address not found");

      const isInternalShipping = shippingProvider === "internal" || String(courierId).toLowerCase() === "karakata-internal";
      if (isInternalShipping) {
        const destination = { latitude: parseFloat(address.latitude), longitude: parseFloat(address.longitude) };
        shippingSnapshot = {
          fullName: user.name || user.fullName || "Customer",
          phone: phone || user.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || null,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          courier: {
            id: 'internal',
            name: 'Karakata Internal',
            rawFee: 0,
            markupAmount: 0,
            totalFee: 0,
            estimatedDays: '1-2',
          },
        };
      } else {
        if (!courierId)         throw new Error("Courier selection is required");

        const packageItems = items.map(it => ({
          name: it.productName,
          description: it.productName,
          unit_weight: String(it.product?.weightKg || 0),
          unit_amount: String(it.unitPrice),
          quantity: String(it.quantity),
        }));
        const dimensions = {
          length: Math.max(...items.map(it => it.product?.lengthCm || 0), 10),
          width: Math.max(...items.map(it => it.product?.widthCm || 0), 10),
          height: Math.max(...items.map(it => it.product?.heightCm || 0), 10),
        };
        const categoryId = items[0].logisticsCategoryId;
        if (!categoryId) throw new Error(`Logistics category missing for ${items[0].productName}`);
        // Requote on the server so a stale browser token never blocks checkout.
        const rateData = await LogisticsService.getShippingRates({
          receiverAddressId: shippingAddressId,
          packageItems,
          packageDimension: dimensions,
          categoryId,
        });
        requestToken = rateData.request_token;

        const selectedCourier = rateData?.couriers?.find(c => String(c.id) === String(courierId));
        if (!selectedCourier) throw new Error("Selected courier is no longer available.");
        courierId = selectedCourier.id;
        serviceCode = selectedCourier.service_code || serviceCode;

        const setting = await SystemSetting.findOne();
        const markupRate = (setting?.shippingMarkupPercent || 0) / 100;
        const rawFee = Number(selectedCourier.fee ?? selectedCourier.raw?.total ?? selectedCourier.raw?.total_fee ?? 0);
        if (!(rawFee > 0)) {
          throw new Error(
            `Courier "${selectedCourier.name || courierId}" returned no price. Please re-select the courier and try again.`
          );
        }
        const markupAmount = parseFloat((rawFee * markupRate).toFixed(2));
        shippingFee = parseFloat((rawFee + markupAmount).toFixed(2));

        shippingSnapshot = {
          fullName: user.name || user.fullName || "Customer",
          phone: phone || user.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || null,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          courier: {
            id: selectedCourier.id,
            name: selectedCourier.name,
            rawFee: rawFee,
            markupAmount: markupAmount,
            totalFee: shippingFee,
            estimatedDays: selectedCourier.estimated_days || null,
          },
        };
      }
    } else if (normalizedShippingMethod === "PICKUP") {
      if (!chosenHubId) throw new Error("Pickup hub selection is required");
      pickupHub = await Hub.findOne({ where: { id: chosenHubId, isActive: true } });
      if (!pickupHub) throw new Error("Selected pickup hub was not found or is inactive");
      // Pickup is not free: charge a configurable percentage of the
      // internal fleet delivery price (station -> pickup hub).
      shippingFee = await this._getPickupFee(pickupHub, items);
    }

    let appliedDiscount = null;
    let globalDiscountAmount = 0;

    // 1. Handle Manual Discount Code
    let manualDiscount = null;
    let manualAmount = 0;
    if (discountCode) {
      try {
        manualDiscount = await DiscountService.validate(discountCode, productTotal);
        const result = DiscountService.apply(manualDiscount, productTotal);
        manualAmount = result.discountAmount;
      } catch (discountErr) {
        console.error(`Manual discount error: ${discountErr.message}`);
      }
    }

    // 2. Handle Automatic Promo
    const autoDiscount = await DiscountService.findActiveAutomaticDiscount(productTotal);
    let autoAmount = 0;
    if (autoDiscount) {
      const result = DiscountService.apply(autoDiscount, productTotal);
      autoAmount = result.discountAmount;
    }

    // 3. Apply the Best Deal
    if (manualAmount > autoAmount) {
      appliedDiscount = manualDiscount;
      globalDiscountAmount = manualAmount;
    } else {
      appliedDiscount = autoDiscount;
      globalDiscountAmount = autoAmount;
    }


    const allocationsMap = {};
    const reservationItems = [];
    for (const item of items) {
      const preference = normalizedShippingMethod === "PICKUP"
        ? { chosenHub: pickupHub }
        : { receiverAddress: address };

      try {
        const { allocations } = await SourcingService.allocateStock(
          item.productId,
          item.quantity,
          preference
        );

        allocationsMap[item.productId] = allocations;
        // Fetch rates are not billed to the customer: external couriers
        // charge last-mile only, and the internal fleet fee already covers
        // the station-to-doorstep transport.

        for (const alloc of allocations) {
          reservationItems.push({
            productId: item.productId,
            pickupStationId: alloc.pickupStationId,
            quantity: alloc.quantity
          });
        }
      } catch (err) {
        throw new Error(`Product ${item.productName} is out of stock. Please remove it from your cart to proceed.`);
      }
    }

    if (normalizedShippingMethod === "SHIPPING" &&
        (shippingProvider === "internal" || String(courierId).toLowerCase() === "karakata-internal")) {
      const totalWeight = items.reduce((sum, it) => sum + (it.product?.weightKg || 0) * it.quantity, 0);
      const origin = await this._getInternalShippingOrigin(Object.keys(allocationsMap));
      const destination = { latitude: Number(address.latitude), longitude: Number(address.longitude) };
      shippingFee = (await shippingManager.getProvider("internal").getQuote(origin, destination, totalWeight)).price;
      shippingSnapshot.courier.rawFee = shippingFee;
      shippingSnapshot.courier.totalFee = shippingFee;
      shippingSnapshot.courier.originStationId = origin.stationId;
    }

    const subtotalWithShipping = productTotal - globalDiscountAmount + shippingFee;

    // --- VAT Calculation ---
    const setting = await SystemSetting.findOne();
    const vatPercentage = setting?.vatPercentage || 0;
    const vatAmount = parseFloat((subtotalWithShipping * (vatPercentage / 100)).toFixed(2));
    const finalGrandTotal = parseFloat((subtotalWithShipping + vatAmount).toFixed(2));

    const t = await sequelize.transaction();
    let committed = false;
    let createdOrder = null;

    try {
      const lockedCart = await Cart.findOne({
        where: { userId, isDeleted: false },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!lockedCart) throw new Error("Cart is empty");
      const lockedCartItems = await CartItem.findAll({
        where: { cartId: lockedCart.id },
        include: [{ model: Product, as: "product" }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (lockedCartItems.length === 0) throw new Error("Cart is empty");
      const lockedCartSnapshot = lockedCartItems.map(({ id, productId, quantity }) => ({
        id,
        productId,
        quantity: Number(quantity),
      }));
      const lockedItemsById = new Map(lockedCartSnapshot.map((item) => [item.id, item]));
      const cartChanged =
        cartSnapshot.length !== lockedCartSnapshot.length ||
        cartSnapshot.some((item) => {
          const lockedItem = lockedItemsById.get(item.id);
          return !lockedItem ||
            lockedItem.productId !== item.productId ||
            lockedItem.quantity !== item.quantity;
        });

      if (cartChanged) {
        throw new Error("Cart has changed. Please review your items and try again.");
      }

      // No reservation: unpaid orders must not hold stock. Validate
      // availability only; stock is deducted when payment is verified.
      await InventoryService.validateAvailabilityForOrder(reservationItems, t);

      const { order, ownerNotifications } = await this._createOrderWithItems(userId, {
        items,
        totalAmount: finalGrandTotal,
        shippingAddressId: address?.id || null,
        shippingSnapshot,
        phone,
        email,
        notes,
        gateway,
        shippingMethod: normalizedShippingMethod,
        chosenHubId,
        logisticsRequestToken: requestToken || null,
        logisticsServiceCode: serviceCode || null,
        logisticsCourierId: courierId || null,
        shippingFee,
        discountCode: appliedDiscount?.code || null,
        discountAmount: globalDiscountAmount,
        discountId: appliedDiscount?.id || null,
        allocationsMap,
        vatAmount, // Pass vatAmount to the helper
      }, t);

      await Payment.create({
        orderId: order.id,
        userId: userId,
        gateway: gateway,
        amount: finalGrandTotal,
        status: 'PENDING'
      }, { transaction: t });

      if (appliedDiscount) {
        await DiscountService.incrementUsage(appliedDiscount.id, t);
      }
      await t.commit();
      committed = true;
      createdOrder = order;
    } catch (err) {
      if (!committed) await t.rollback();
      throw err;
    }

    // --- Post-Commit Side Effects (Non-Critical) ---
    // We execute these outside the transaction try-catch so that a failure
    // in notifications or auditing doesn't report a failure to the user
    // after the order has already been successfully committed.
    try {
      await NotificationService.orderPlaced(userId, createdOrder.id, finalGrandTotal)
        .catch((notificationError) =>
          console.error(`Customer order notification failed for ${createdOrder.id}:`, notificationError.message)
        );

      await auditService.log({
        userId,
        action: "ORDER_CHECKOUT",
        entityType: "Order",
        entityId: createdOrder.id,
        newValue: {
          totalAmount: finalGrandTotal,
          shippingMethod: normalizedShippingMethod,
          status: "PENDING"
        }
      }).catch((auditError) => console.error(`Order audit failed for ${createdOrder.id}:`, auditError.message));

      await Promise.all([...ownerNotifications.entries()].map(([ownerId, ownerItems]) =>
        NotificationService.notify(ownerId, {
          type: "ORDER_ITEM_APPROVAL_REQUIRED",
          title: "New order awaiting approval",
          message: `${ownerItems.length} item(s) from your store require approval for order #${createdOrder.id.slice(0, 8)}.`,
          metadata: { orderId: createdOrder.id, items: ownerItems },
          sendEmail: true,
        }).catch((notificationError) =>
          console.error(`Store owner notification failed for ${ownerId}:`, notificationError.message)
        )
      ));

      emailService.sendNotificationEmail(user.email, "Order Placed!", `Your order #${createdOrder.id.slice(0, 8)} has been placed successfully. Please proceed to payment to confirm your purchase. Total: ₦${finalGrandTotal.toLocaleString()}`).catch(err =>
        console.error("Order placed email error:", err)
      );
    } catch (sideEffectError) {
      console.error("Critical error in post-commit side effects:", sideEffectError.message);
    }

    try {
      const paymentInit = await PaymentService.initialize({
        order: { id: createdOrder.id, totalAmount: finalGrandTotal },
        user,
        gateway,
        email: email || user.email,
        redirectUrl: process.env.BACKEND_BASE_URL,
      });
      const paymentTransaction = await sequelize.transaction();
      try {
        await Order.update({
          paymentReference: paymentInit.paymentReference,
          paymentGateway: gateway,
        }, { where: { id: createdOrder.id }, transaction: paymentTransaction });
        await Payment.update({
          reference: paymentInit.paymentReference,
          paymentUrl: paymentInit.paymentUrl,
        }, { where: { orderId: createdOrder.id, status: "PENDING" }, transaction: paymentTransaction });
        await paymentTransaction.commit();
      } catch (updateError) {
        await paymentTransaction.rollback();
        throw updateError;
      }
      return { order: createdOrder, paymentUrl: paymentInit.paymentUrl };
    } catch (paymentError) {
      console.error(`Payment initialization failed for order ${createdOrder.id}:`, paymentError.message);
      return {
        order: createdOrder,
        paymentUrl: null,
        paymentInitializationRequired: true,
        paymentInitializationError: paymentError.message,
      };
    }
  }

  async retryPayment(orderId, userId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized to retry payment for this order");
    if (order.status === "PAID") throw new Error("Order is already paid");

    const payment = await Payment.findOne({ where: { orderId } });
    if (!payment) throw new Error("Payment record not found");

    // 1. Verify if previous attempt actually succeeded at the gateway
    if (payment.reference) {
      const isSuccess = await PaymentService.verifyPayment({
        gateway: order.paymentGateway || payment.gateway,
        reference: payment.reference,
      });
      if (isSuccess) {
        // Gateway says it's paid, but our DB says PENDING. Sync it.
        order.status = "PAID";
        payment.status = "SUCCESS";
        await order.save();
        await payment.save();
        return { success: true, message: "Payment was already successful. Order updated.", order };
      }
    }

    // 2. Re-initialize payment
    const user = await User.findByPk(userId);
    const paymentInit = await PaymentService.initialize({
      order: { id: order.id, totalAmount: order.totalAmount },
      user,
      gateway: order.paymentGateway || payment.gateway,
      email: user.email,
      redirectUrl: process.env.BACKEND_BASE_URL,
    });

    // Update existing payment record (NO NEW RECORD CREATED)
    await Payment.update({
      reference: paymentInit.paymentReference,
      paymentUrl: paymentInit.paymentUrl,
      status: "PENDING",
    }, { where: { id: payment.id } });

    await Order.update({
      paymentReference: paymentInit.paymentReference,
    }, { where: { id: order.id } });

    return {
      success: true,
      paymentUrl: paymentInit.paymentUrl,
      message: "Payment re-initialized successfully."
    };
  }


  async verify(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [{
        model: OrderItem,
        as: "items",
        include: [
          { model: OrderItemFulfillment, as: "fulfillments" },
          { model: Product, as: "product" },
        ],
      }]
    });
    if (!order) throw new Error("Order not found");

    const verified = await PaymentService.verifyPayment({
      reference: order.paymentReference,
      gateway: order.paymentGateway,
    });

    order.status = verified ? "PAID" : "FAILED";
    await order.save();

    if (verified) {
      const paidUser = await User.findByPk(order.userId);
      if (paidUser) await NotificationService.notifyOrderPaid(paidUser, order);

      // Notify Store Owners that payment is confirmed
      const storeOwnerIds = new Set();
      for (const item of order.items) {
        if (item.product?.store?.ownerUserId) {
          storeOwnerIds.add(item.product.store.ownerUserId);
        }
      }
      await Promise.all(
        Array.from(storeOwnerIds).map(ownerId =>
          NotificationService.notifyStoreOwnersPayment(ownerId, order)
            .catch(err => console.error(`Store owner notification failed for ${ownerId}:`, err.message))
        )
      );

      await auditService.log({
        userId: order.userId,
        action: "ORDER_PAYMENT_VERIFIED",
        entityType: "Order",
        entityId: order.id,
        newValue: { status: "PAID", paymentStatus: "SUCCESS" }
      });

      const t = await sequelize.transaction();
      try {
        // Idempotency Guard: Check if this order has already been financially processed
        // We use the existence of a SALE_CREDIT transaction as the source of truth
        const alreadyProcessed = await sequelize.models.WalletTransaction.findOne({
          where: { orderId: order.id, type: 'SALE_CREDIT' },
          transaction: t
        });

        if (!alreadyProcessed) {
          const inventoryDeductions = [];
          for (const item of order.items) {
            if (item.fulfillments) {
              for (const f of item.fulfillments) {
                inventoryDeductions.push({
                  productId: item.productId,
                  pickupStationId: f.pickupStationId,
                  quantity: f.quantity
                });
              }
            }
          }

          await InventoryService.commitForOrder(inventoryDeductions, t);
          await WalletService.creditOnPayment(order, t);
        }
        await t.commit();
      } catch (invErr) {
        await t.rollback();
        console.error(`❌ Post-payment processing failed for order ${order.id}:`, invErr.message);
      }

      if (order.shippingMethod === "SHIPPING") {
        try {
          // Idempotency Guard: Don't create duplicate shipments
          const existingShipment = await Shipment.findOne({
            where: { orderId: order.id, isDeleted: false }
          });

          if (existingShipment) {
            console.log(`Shipment already exists for order ${order.id}, skipping creation.`);
          } else {
            const provider = order.shippingSnapshot?.courier?.id || 'shipbubble';

            if (provider === 'internal') {
              const shipment = await Shipment.create({
                orderId: order.id,
                provider: 'internal',
                providerId: null,
                providerOrderId: `INT-${order.id.slice(0, 8).toUpperCase()}`,
                shippingFee: order.shippingFee,
                status: 'pending',
              });

              await LogisticsService.syncOrderLogisticsStatus(order.id, shipment.status);

              await ShipmentEvent.create({
                shipmentId: shipment.id,
                status: 'ORDER_RECEIVED',
                location: 'Central Hub',
                note: 'Order received and queued for pickup',
              });
            } else {
              await this.createExternalShipmentWithRefresh(order);
            }
          }
        } catch (logisticsError) {
          console.error(`❌ Logistics failure for order ${order.id}:`, logisticsError.message);
          await order.update({ logisticsStatus: "DELIVERY_FAILED" });

          const shipmentCheck = await Shipment.findOne({
            where: { orderId: order.id, isDeleted: false },
          });
          if (!shipmentCheck) {
            const failedShipment = await Shipment.create({
              orderId: order.id,
              provider: order.shippingSnapshot?.courier?.id === "internal" ? "internal" : "shipbubble",
              providerOrderId: `FAILED-${order.id.slice(0, 8).toUpperCase()}`,
              shippingFee: order.shippingFee,
              status: "failed",
              rawResponse: { error: logisticsError.message },
            });
            await LogisticsService.syncOrderLogisticsStatus(order.id, failedShipment.status);
            await ShipmentEvent.create({
              shipmentId: failedShipment.id,
              status: "DELIVERY_FAILED",
              location: "Karakata",
              note: logisticsError.message,
            });
          }
        }
      }

      // Send Invoice Email - only if this is the first time the order is verified as PAID
      try {
        const user = await User.findByPk(order.userId);
        if (user && user.email) {
          // We can check if we should send the email based on the same alreadyProcessed flag
          // but since the transaction is already committed, we just check the DB
          const processed = await sequelize.models.WalletTransaction.findOne({
            where: { orderId: order.id, type: 'SALE_CREDIT' }
          });

          // Note: Since we just committed the transaction above, processed will be true
          // if we just did it, or true if it was already there.
          // To avoid duplicates on RE-verification, we only send if the status just changed to PAID
          // but since we don't track "emailSent" flag, we'll trust the a basic check.
          // For now, we send it, but in a production system we'd have an EmailLog.
          const invoiceData = await this.prepareInvoiceEmailData(order.id);
          await emailService.sendInvoiceEmail(user.email, invoiceData);
          console.log(`✅ Invoice email sent to ${user.email} for order ${order.id}`);
        }
      } catch (emailErr) {
        console.error(`❌ Failed to send invoice email for order ${order.id}:`, emailErr.message);
      }
    }

    return { order, verified };
  }

  async createExternalShipmentWithRefresh(order) {
    const create = (requestToken, serviceCode, courierId, courierName) =>
      LogisticsService.createShipment({
        orderId: order.id,
        requestToken,
        serviceCode,
        courierId,
        courierName,
        shippingFee: order.shippingFee,
      });

    try {
      return await create(
        order.logisticsRequestToken,
        order.logisticsServiceCode,
        order.logisticsCourierId,
        order.shippingSnapshot?.courier?.name
      );
    } catch (err) {
      if (!/token|rate request|expired|invalid/i.test(err.message)) throw err;

      const packageItems = order.items.map(item => ({
        name: item.productName || item.product?.name || "Product",
        description: item.productName || item.product?.name || "Product",
        unit_weight: String(item.product?.weightKg || 0),
        unit_amount: String(item.price || 0),
        quantity: String(item.quantity || 0),
      }));
      const dimensions = {
        length: Math.max(...order.items.map(item => Number(item.product?.lengthCm || 0)), 10),
        width: Math.max(...order.items.map(item => Number(item.product?.widthCm || 0)), 10),
        height: Math.max(...order.items.map(item => Number(item.product?.heightCm || 0)), 10),
      };
      const categoryId = order.items.find(item => item.product?.logisticsCategoryId)?.product?.logisticsCategoryId;
      if (!order.shippingAddressId || !categoryId) {
        throw new Error("Cannot refresh ShipBubble rates: shipping address or logistics category is missing");
      }

      const rates = await LogisticsService.getShippingRates({
        receiverAddressId: order.shippingAddressId,
        packageItems,
        packageDimension: dimensions,
        categoryId,
        senderStationId: order.items[0]?.pickupStationId,
      });
      const originalCourierId = String(order.logisticsCourierId || order.shippingSnapshot?.courier?.id || "");
      const selected = rates.couriers.find(rate =>
        String(rate.id) === originalCourierId ||
        String(rate.service_code || "") === String(order.logisticsServiceCode || "")
      );
      if (!selected || !rates.request_token) {
        throw new Error("The previously selected ShipBubble courier is no longer available; manual reselection is required");
      }

      const serviceCode = selected.service_code || order.logisticsServiceCode;
      await order.update({
        logisticsRequestToken: rates.request_token,
        logisticsCourierId: String(selected.id),
        logisticsServiceCode: serviceCode,
      });
      return create(rates.request_token, serviceCode, selected.id, selected.name);
    }
  }

  /**
   * Recovery Utility: Creates missing shipments for all PAID orders that have shipping
   * but no associated Shipment record.
   */
  async recoverPaidOrders() {
    const paidOrdersWithoutFullProcessing = await Order.findAll({
      where: {
        status: "PAID",
        shippingMethod: "SHIPPING"
      },
      include: [
        {
          model: Shipment,
          as: "shipments",
          required: false,
          where: { isDeleted: false },
        },
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        }
      ]
    });

    let repairedCount = 0;
    const failedOrders = [];

    for (const order of paidOrdersWithoutFullProcessing) {
      let needsRepair = false;
      const addFailure = (err, action) => {
        console.error(`Failed to repair order ${order.id}:`, err.message);
        failedOrders.push({
          orderId: order.id,
          provider: order.logisticsCourierId ? "shipbubble" : "internal",
          reason: err.message,
          action: action || "Review the order and retry recovery after correcting the reported error.",
        });
      };

      try {
        // 1. Recover Shipment if missing
        if (!order.shipments || order.shipments.length === 0) {
          let isInternal = false;
          if (order.shippingSnapshot?.courier?.id === 'internal' ||
              order.shippingSnapshot?.courier?.name?.toLowerCase().includes('internal')) {
            isInternal = true;
          } else if (!order.logisticsCourierId && !order.shippingSnapshot) {
            // Fallback: if no courier ID and no snapshot, assume internal as we can't recover external
            isInternal = true;
          }

          if (isInternal) {
            const shipment = await Shipment.create({
              orderId: order.id,
              provider: 'internal',
              providerOrderId: `INT-${order.id.slice(0, 8).toUpperCase()}`,
              shippingFee: order.shippingFee,
              status: 'pending',
            });
            await ShipmentEvent.create({
              shipmentId: shipment.id,
              status: 'ORDER_RECEIVED',
              location: 'Central Hub',
              note: 'Recovery: Order received and queued for pickup',
            });
          } else {
            await this.createExternalShipmentWithRefresh(order);
          }
          needsRepair = true;
        } else {
          // Older recovery runs created the shipment row without its initial event.
          // Backfill the event so the admin fleet view has a reliable location/history.
          for (const shipment of order.shipments) {
            const hasEvent = await ShipmentEvent.findOne({
              where: { shipmentId: shipment.id },
            });
            if (!hasEvent && shipment.provider === "internal") {
              await ShipmentEvent.create({
                shipmentId: shipment.id,
                status: "ORDER_RECEIVED",
                location: "Central Hub",
                note: "Recovery: initial tracking event restored",
              });
              needsRepair = true;
            }
          }
        }
      } catch (err) {
        addFailure(
          err,
          /token|rate request|expired|invalid/i.test(err.message)
            ? "The server attempted a fresh ShipBubble quote. Review courier availability and retry recovery."
            : undefined
        );
      }

      try {
        // 2. Recover Wallet Credits if missing
        const hasCredits = await sequelize.models.WalletTransaction.findOne({
          where: { orderId: order.id, type: 'SALE_CREDIT' }
        });
        if (!hasCredits) {
          await WalletService.creditOnPayment(order);
          needsRepair = true;
        }
      } catch (err) {
        addFailure(
          err,
          /Store for product/i.test(err.message)
            ? "The product references a missing store. Restore or reassign the store, then retry wallet recovery."
            : undefined
        );
      }

      if (needsRepair) repairedCount++;
    }
    return {
      repairedCount,
      failedCount: failedOrders.length,
      failedOrders,
    };
  }

  async getInvoice(orderId, userId) {
    const order = await Order.findByPk(orderId, {
      attributes: ["id", "userId", "totalAmount", "shippingFee", "vatAmount", "discountAmount", "status", "logisticsStatus", "createdAt", "discountId", "shippingSnapshot"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "phone"],
        },
        {
          model: Address,
          as: "shippingAddress",
          attributes: ["addressLine1", "addressLine2", "city", "state", "postalCode", "country"],
        },
        {
          model: Discount,
          as: "globalDiscount",
          attributes: ["id", "title", "code", "type", "value"],
        },
        {
          model: OrderItem,
          as: "items",
          separate: true,
          attributes: ["id", "quantity", "price", "subtotal"],
          include: [
            {
              model: Product.unscoped(),
              as: "product",
              attributes: ["id", "name"],
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  attributes: ["url"],
                },
                {
                  model: Store,
                  as: "store",
                  attributes: ["name"]
                }
              ],
            },
            {
              model: ProductDiscount,
              as: "itemDiscount",
              attributes: ["id", "value", "discountType"],
            },
            {
              model: OrderItemFulfillment,
              as: "fulfillments",
              attributes: ["pickupStationId", "quantity"],
              include: [{
                model: StorePickupStation,
                as: "pickupStation",
                attributes: ["id", "name", "address", "phone", "latitude", "longitude"]
              }]
            }
          ],
        },
        {
          model: Payment,
          as: "payment",
          attributes: ["id", "amount", "status"],
        },
      ],
    });

    if (!order) throw new Error("Order not found");

    if (order.status !== "PAID" && order.userId !== userId) {
      throw new Error("Unauthorized access to this order");
    }

    // Fetch tracking data via the Shipping Manager
    let trackingInfo = { status: 'pending', trackingUrl: null, events: [] };
    try {
      const shipment = await Shipment.findOne({ where: { orderId: order.id } });
      if (shipment) {
        trackingInfo = await shippingManager.trackShipment(shipment);
      }
    } catch (err) {
      console.error(`Error fetching tracking for invoice ${orderId}:`, err.message);
    }

    // Calculate Sourcing/Fetch Fee
    // Sourcing fee is (Total Shipping Fee - Base Courier Fee)
    const baseCourierFee = parseFloat((order.shippingSnapshot?.courier?.totalFee || 0).toFixed(2));
    const totalShippingFee = parseFloat((order.shippingFee || 0).toFixed(2));
    const sourcingFee = parseFloat((totalShippingFee - baseCourierFee).toFixed(2));

    return {
      order: {
        id:              order.id,
        totalAmount:     order.totalAmount,
        shippingFee:     totalShippingFee,
        vatAmount:       order.vatAmount || 0,
        discountAmount:  order.discountAmount || 0,
        status:          order.status,
        logisticsStatus: order.logisticsStatus,
        createdAt:       order.createdAt,
        discount: order.globalDiscount ? {
          title: order.globalDiscount.title,
          code: order.globalDiscount.code,
          type: order.globalDiscount.type,
          value: order.globalDiscount.value,
        } : null,
        customer: {
          fullName: order.user?.name || "Customer",
          email: order.user?.email || "N/A",
          phone: order.phone || order.user?.phone || "N/A",
        },
        shippingAddress: order.shippingAddress ? {
          address: `${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`,
        } : null,
        shippingDetails: {
          totalFee: totalShippingFee,
          baseFee: baseCourierFee,
          sourcingFee: sourcingFee,
          status: trackingInfo.status,
          trackingUrl: trackingInfo.trackingUrl,
          events: trackingInfo.events,
        },
      },
      items: order.items.map(item => {
        const subtotal = Number(item.subtotal ?? item.quantity * item.price);

        let calculatedDiscountValue = 0;
        if (item.itemDiscount) {
          const val = parseFloat(item.itemDiscount.value || 0);
          if (item.itemDiscount.discountType === 'PERCENTAGE') {
            // Original = Final / (1 - disc%)
            const originalPrice = item.price / (1 - val / 100);
            calculatedDiscountValue = (originalPrice - item.price) * item.quantity;
          } else {
            calculatedDiscountValue = val * item.quantity;
          }
        }

        return {
          id:       item.id,
          quantity: item.quantity,
          price:    item.price,
          subtotal: subtotal,
          discount: item.itemDiscount ? {
            name: "Product Discount",
            value: calculatedDiscountValue.toFixed(2),
            type: item.itemDiscount.discountType,
          } : null,
          product: {
            id:    item.product?.id,
            name:  item.product?.name || item.productName,
            image: item.product?.images?.[0]?.url || null,
          },
          approvalStatus: item.approvalStatus,
          fulfillments: (item.fulfillments || []).map(f => ({
            pickupStationId: f.pickupStationId,
            quantity: f.quantity,
            stationName: f.pickupStation?.name || null,
            stationAddress: f.pickupStation?.address || null,
            stationPhone: f.pickupStation?.phone || null,
          }))
        };
      }),
      payment: order.payment,
    };
  }

  /**
   * Prepares data for Invoice Email
   */
  async prepareInvoiceEmailData(orderId) {
    const invoiceData = await this.getInvoice(orderId, null); // Null userId to skip auth check for system email
    const { order, items } = invoiceData;

    return {
      orderId: order.id,
      totalAmount: order.totalAmount,
      customerName: order.customer.fullName,
      userEmail: order.customer.email,
      items: items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }))
    };
  }
}

module.exports = new OrderServices();
