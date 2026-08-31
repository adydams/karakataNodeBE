const { sequelize, Order, OrderItem, Cart, CartItem, Product, User, Payment, ProductImage, Address, OrderItemFulfillment, ProductDiscount, Discount, SystemSetting, Shipment, Store } = require("../models");
const { Op } = require("sequelize");
const PaymentService = require("./paymentServices");
const LogisticsService = require("./logisticsService");
const InventoryService = require("./inventoryServices");
const NotificationService = require("./notificationService");
const DiscountService = require("./DiscountServices");
const SourcingService = require("./SourcingService");
const ShipBubbleAdapter = require("./ShipBubbles/shipbubbleAdapterSafe");
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
    const origin = { latitude: 6.5244, longitude: 3.3792 }; // Default Lagos Hub coordinates

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
    logisticsRequestToken,
    logisticsServiceCode,
    logisticsCourierId,
    shippingFee,
    discountCode,
    discountAmount,
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
      logisticsRequestToken,
      logisticsServiceCode,
      logisticsCourierId,
      shippingFee: shippingFee || 0,
      status: "PENDING",
    }, { transaction });

    for (const item of items) {
      const orderItem = await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        productDiscountId: item.appliedDiscountId,
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
    }

    return order;
  }

  async getAdminOrders({ userId, role, limit = 10, offset = 0, search = "", status = "ALL", startDate = null, endDate = null }) {
    const conditions = [];

    if (role === "Admin") {
      const admin = await User.findByPk(userId);
      if (!admin || !admin.storeId) {
        throw new Error("Admin is not linked to any store");
      }

      conditions.push({
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT "orderId" FROM "OrderItems" AS oi
            JOIN "Products" AS p ON oi."productId" = p.id
            WHERE p."storeId" = '${admin.storeId}'
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
                SELECT id FROM "Users"
                WHERE name ILIKE '%${search}%' OR email ILIKE '%${search}%'
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
                { model: ProductImage, as: "images", attributes: ["url"] }
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
    chosenStationId, // required if shippingMethod === 'pickup'
    requestToken,
    serviceCode,
    courierId,
    shippingProvider, // 'internal' or 'shipbubble'
    discountCode,
  }) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    // ── PHASE 1: CART PROCESSING (Needed for weight/pricing) ──────────────────
    const cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: "items",
        include: [{
          model: Product,
          as: "product",
          include: [{ model: ProductDiscount, as: "discounts" }]
        }],
      }],
    });

    if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

    let productTotal = 0;
    const items = [];
    for (const item of cart.items) {
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
    const normalizedShippingMethod = String(shippingMethod).toLowerCase() === "shipping" ? "SHIPPING" : "pickup";

    if (normalizedShippingMethod === "SHIPPING") {
      if (!shippingAddressId) throw new Error("Shipping address is required");

      address = await Address.findOne({
        where: { id: shippingAddressId, userId, isDeleted: false },
      });
      if (!address) throw new Error("Shipping address not found");

      if (shippingProvider === 'internal') {
        const totalWeight = items.reduce((sum, it) => sum + (it.product?.weightKg || 0) * it.quantity, 0);
        const origin = { latitude: 6.5244, longitude: 3.3792 }; // Default Lagos Hub
        const destination = { latitude: parseFloat(address.latitude), longitude: parseFloat(address.longitude) };

        shippingFee = await shippingManager.getProvider('internal').getQuote(origin, destination, totalWeight)
          .then(q => q.price);

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
            rawFee: shippingFee,
            markupAmount: 0,
            totalFee: shippingFee,
            estimatedDays: '1-2',
          },
        };
      } else {
        if (!requestToken)      throw new Error("Request token is required to verify shipping rate");
        if (!courierId)         throw new Error("Courier selection is required");

        let rateData;
        try {
          rateData = await ShipBubbleAdapter.getRates({ requestToken });
        } catch (tokenErr) {
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
          rateData = await LogisticsService.getShippingRates({
            receiverAddressId: shippingAddressId,
            packageItems,
            packageDimension: dimensions,
            categoryId: categoryId,
          });
        }

        const selectedCourier = rateData?.couriers?.find(c => String(c.id) === String(courierId));
        if (!selectedCourier) throw new Error("Selected courier is no longer available.");

        const setting = await SystemSetting.findOne();
        const markupRate = (setting?.shippingMarkupPercent || 0) / 100;
        const rawFee = selectedCourier.fee;
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
    } else if (normalizedShippingMethod === "pickup") {
      if (!chosenStationId) throw new Error("Pickup station selection is required");
      shippingFee = 0;
    }

    let appliedDiscount = null;
    let discountAmount = 0;
    if (discountCode) {
      appliedDiscount = await DiscountService.validate(discountCode, 0);
    }

    const allocationsMap = {};
    const reservationItems = [];
    for (const item of items) {
      const preference = normalizedShippingMethod === "pickup"
        ? { chosenStationId }
        : { receiverAddress: address };

      try {
        const { allocations, fetchRate } = await SourcingService.allocateStock(
          item.productId,
          item.quantity,
          preference
        );

        allocationsMap[item.productId] = allocations;
        if (normalizedShippingMethod === "SHIPPING") {
          shippingFee += fetchRate;
        }

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

    const finalGrandTotal = productTotal - discountAmount + shippingFee;

    const t = await sequelize.transaction();
    let committed = false;
    let createdOrder = null;

    try {
      const lockedCart = await Cart.findOne({
        where: { userId },
        include: [{ model: CartItem, as: "items" }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!lockedCart || lockedCart.items.length === 0) throw new Error("Cart is empty");
      if (lockedCart.items.length !== items.length) {
        throw new Error("Cart has changed. Please review your items and try again.");
      }

      // Stock reservation removed: Availability is now confirmed at payment verification.

      const order = await this._createOrderWithItems(userId, {
        items,
        totalAmount: finalGrandTotal,
        shippingAddressId: address?.id || null,
        shippingSnapshot,
        phone,
        email,
        notes,
        gateway,
        shippingMethod: normalizedShippingMethod,
        logisticsRequestToken: requestToken || null,
        logisticsServiceCode: serviceCode || null,
        logisticsCourierId: courierId || null,
        shippingFee,
        discountCode: appliedDiscount?.code || null,
        discountAmount,
        allocationsMap,
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
      await NotificationService.orderPlaced(userId, order.id, finalGrandTotal, t);

      await t.commit();
      committed = true;
      createdOrder = order;

      await auditService.log({
        userId,
        action: "ORDER_CHECKOUT",
        entityType: "Order",
        entityId: order.id,
        newValue: {
          totalAmount: finalGrandTotal,
          shippingMethod: normalizedShippingMethod,
          status: "PENDING"
        }
      });

      // Send Order Confirmation Email
      emailService.sendNotificationEmail(user.email, "Order Placed!", `Your order #${order.id.slice(0, 8)} has been placed successfully. Please proceed to payment to confirm your purchase. Total: ₦${finalGrandTotal.toLocaleString()}`).catch(err =>
        console.error("Order placed email error:", err)
      );
    } catch (err) {
      if (!committed) await t.rollback();
      throw err;
    }

    const paymentInit = await PaymentService.initialize({
      order: { id: createdOrder.id, totalAmount: finalGrandTotal },
      user,
      gateway,
      email: email || user.email,
      redirectUrl: process.env.BACKEND_BASE_URL,
    });

    await createdOrder.update({
      paymentReference: paymentInit.paymentReference,
      paymentGateway: gateway,
    });

    await Payment.update(
      {
        reference: paymentInit.paymentReference,
        paymentUrl: paymentInit.paymentUrl
      },
      { where: { orderId: createdOrder.id, status: 'PENDING' } }
    );

    return { order: createdOrder, paymentUrl: paymentInit.paymentUrl };
  }

  async verify(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: "items", include: [{ model: OrderItemFulfillment, as: "fulfillments" }] }]
    });
    if (!order) throw new Error("Order not found");

    const verified = await PaymentService.verifyPayment({
      reference: order.paymentReference,
      gateway: order.paymentGateway,
    });

    order.status = verified ? "PAID" : "FAILED";
    await order.save();

    if (verified) {
      await NotificationService.orderPaid(order.userId, order.id);

      await auditService.log({
        userId: order.userId,
        action: "ORDER_PAYMENT_VERIFIED",
        entityType: "Order",
        entityId: order.id,
        newValue: { status: "PAID", paymentStatus: "SUCCESS" }
      });

      const t = await sequelize.transaction();
      try {
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
        await t.commit();
      } catch (invErr) {
        await t.rollback();
        console.error(`❌ Post-payment processing failed for order ${order.id}:`, invErr.message);
      }

      if (order.shippingMethod === "SHIPPING") {
        try {
          // Determine the shipping provider from the snapshot
          const provider = order.shippingSnapshot?.courier?.id || 'shipbubble';

          if (provider === 'internal') {
            // Create an internal shipment
            const shipment = await Shipment.create({
              orderId: order.id,
              provider: 'internal',
              providerId: null, // Linked via provider name
              providerOrderId: `INT-${order.id.slice(0, 8).toUpperCase()}`,
              shippingFee: order.shippingFee,
              status: 'pending',
            });

            // Initial event for internal tracking
            await ShipmentEvent.create({
              shipmentId: shipment.id,
              status: 'ORDER_RECEIVED',
              location: 'Central Hub',
              note: 'Order received and queued for pickup',
            });
          } else {
            // Existing ShipBubble logic
            await LogisticsService.createShipment({
              orderId:      order.id,
              requestToken: order.logisticsRequestToken,
              serviceCode:  order.logisticsServiceCode,
              courierId:    order.logisticsCourierId,
              courierName:  null,
              shippingFee:  order.shippingFee,
              trackingLevel:  null,
              deliveryEta:    null,
              insuranceCode:  null,
            });
          }
        } catch (logisticsError) {
          console.error(`❌ Logistics failure for order ${order.id}:`, logisticsError.message);
        }
      }

      // Send Invoice Email with PDF Attachment
      try {
        const user = await User.findByPk(order.userId);
        if (user && user.email) {
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

  async getInvoice(orderId, userId) {
    const order = await Order.findByPk(orderId, {
      attributes: ["id", "userId", "totalAmount", "shippingFee", "status", "logisticsStatus", "createdAt", "discountId", "shippingSnapshot"],
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
          attributes: ["id", "code", "type", "value"],
        },
        {
          model: OrderItem,
          as: "items",
          attributes: ["id", "quantity", "price"],
          include: [
            {
              model: Product,
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
              attributes: ["id", "value"],
            },
            {
              model: OrderItemFulfillment,
              as: "fulfillments",
              attributes: ["pickupStationId", "quantity"]
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
        status:          order.status,
        logisticsStatus: order.logisticsStatus,
        createdAt:       order.createdAt,
        discount: order.globalDiscount ? {
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
        const subtotal = item.quantity * item.price;

        let calculatedDiscountValue = 0;
        if (item.itemDiscount) {
          const val = parseFloat(item.itemDiscount.value || 0);
          if (item.itemDiscount.type === 'PERCENTAGE') {
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
            type: item.itemDiscount.type,
          } : null,
          product: {
            id:    item.product?.id,
            name:  item.product?.name,
            image: item.product?.images?.[0]?.url || null,
          },
          fulfillments: item.fulfillments
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
