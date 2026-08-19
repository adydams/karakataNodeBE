const { sequelize, Order, OrderItem, Cart, CartItem, Product, User, Payment, ProductImage, Address, OrderItemFulfillment } = require("../models");
const PaymentService = require("./paymentServices");
const LogisticsService = require("./logisticsService");
const InventoryService = require("./inventoryServices");
const NotificationService = require("./notificationServices");
const DiscountService = require("./DiscountServices");
const SourcingService = require("./SourcingService");
const ShipBubbleAdapter = require("./ShipBubbles/shipbubbleAdapterSafe");
const WalletService = require("./walletServices");
const { SystemSetting } = require("../models");

class OrderServices {

  /**
   * Calculates shipping quotes with platform markup.
   * Called by the frontend to show shipping options to the customer.
   */
  async getShippingQuote(userId, params) {
    const setting = await SystemSetting.findOne();
    const markupRate = (setting?.shippingMarkupPercent || 0) / 100;

    // params should include receiverAddressId, packageItems, packageDimension, etc.
    const rates = await LogisticsService.getShippingRates({ ...params });

    if (rates && rates.couriers) {
      rates.couriers = rates.couriers.map(courier => ({
        ...courier,
        rawFee:         courier.fee,
        markupAmount:   parseFloat((courier.fee * markupRate).toFixed(2)),
        displayFee:     parseFloat((courier.fee * (1 + markupRate)).toFixed(2)),
        fee:            parseFloat((courier.fee * (1 + markupRate)).toFixed(2)), // overwrite for consistency
      }));
    }

    return rates;
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
      notes,
      gateway,
      shippingMethod,
      logisticsRequestToken,
      logisticsServiceCode,
      logisticsCourierId,
      shippingFee: shippingFee || 0,
      discountCode: discountCode || null,
      discountAmount: discountAmount || 0,
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

  async checkout(userId, {
    shippingAddressId,
    phone,
    notes,
    gateway,
    email,
    shippingMethod, // 'logistics' or 'pickup'
    chosenStationId, // required if shippingMethod === 'pickup'
    requestToken,
    serviceCode,
    courierId,
    discountCode,
  }) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    let address = null;
    let shippingSnapshot = null;
    let shippingFee = 0;
    const normalizedShippingMethod = String(shippingMethod).toLowerCase() === "shipping" ? "SHIPPING" : "pickup";

    if (normalizedShippingMethod === "SHIPPING") {
      if (!shippingAddressId) throw new Error("Shipping address is required");
      if (!requestToken)      throw new Error("Request token is required to verify shipping rate");
      if (!courierId)         throw new Error("Courier selection is required");

      address = await Address.findOne({
        where: { id: shippingAddressId, userId, isDeleted: false },
      });
      if (!address) throw new Error("Shipping address not found");

      let rateData;
      try {
        rateData = await ShipBubbleAdapter.getRates({ requestToken });
      } catch {
        throw new Error("Unable to verify shipping rate. Please restart checkout.");
      }

      const selectedCourier = rateData?.couriers?.find(c => String(c.id) === String(courierId));
      if (!selectedCourier) throw new Error("Selected courier is no longer available.");

      // Apply live markup here as well to ensure correctness at checkout
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
    } else if (normalizedShippingMethod === "pickup") {
      if (!chosenStationId) throw new Error("Pickup station selection is required");
      shippingFee = 0;
    }

    let appliedDiscount = null;
    let discountAmount = 0;
    if (discountCode) {
      appliedDiscount = await DiscountService.validate(discountCode, 0);
    }

    const t = await sequelize.transaction();
    let committed = false;

    try {
      const cart = await Cart.findOne({
        where: { userId },
        include: [{
          model: CartItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

      let productTotal = 0;
      const items = cart.items.map((item) => {
        if (!item.product) throw new Error(`Product not found for cart item ${item.id}`);
        const subtotal = item.quantity * item.product.price;
        productTotal += subtotal;
        return {
          productId:   item.productId,
          productName: item.product.name,
          unitPrice:   item.product.price,
          quantity:    item.quantity,
          subtotal,
        };
      });

      if (appliedDiscount) {
        await DiscountService.validate(discountCode, productTotal);
        ({ discountAmount } = DiscountService.apply(appliedDiscount, productTotal));
      }

      const grandTotal = productTotal - discountAmount + shippingFee;

      const allocationsMap = {};
      const reservationItems = [];
      for (const item of items) {
        const preference = shippingMethod === "pickup"
          ? { chosenStationId }
          : { receiverAddress: address };

        const { allocations, fetchRate } = await SourcingService.allocateStock(
          item.productId,
          item.quantity,
          preference
        );

        allocationsMap[item.productId] = allocations;
        if (shippingMethod === "SHIPPING") {
          shippingFee += fetchRate;
        }

        // Prepare for reservation
        for (const alloc of allocations) {
          reservationItems.push({
            productId: item.productId,
            pickupStationId: alloc.pickupStationId,
            quantity: alloc.quantity
          });
        }
      }

      const finalGrandTotal = productTotal - discountAmount + shippingFee;

      // ── ATOMIC RESERVATION ──────────────────
      // Reserve stock BEFORE creating the order. If any item fails, the order is not created.
      await InventoryService.reserveForOrder(reservationItems, t);

      const order = await this._createOrderWithItems(userId, {
        items,
        totalAmount: finalGrandTotal,
        shippingAddressId: address?.id || null,
        shippingSnapshot,
        phone,
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

      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
      if (appliedDiscount) {
        await DiscountService.incrementUsage(appliedDiscount.id, t);
      }
      await NotificationService.orderPlaced(userId, order.id, finalGrandTotal, t);

      await t.commit();
      committed = true;

      const paymentInit = await PaymentService.initialize({
        order,
        user,
        gateway,
        email: email || user.email,
        redirectUrl: process.env.BACKEND_BASE_URL,
      });

      await order.update({
        paymentReference: paymentInit.payment.reference,
        paymentGateway: gateway,
      });

      return { order, paymentUrl: paymentInit.paymentUrl };
    } catch (err) {
      if (!committed) await t.rollback();
      throw err;
    }
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

        // 1. Commit Inventory (Deduct’s the reserved stock)
        await InventoryService.commitForOrder(inventoryDeductions, t);

        // 2. Credit Store Wallet ( Pending payout)
        await WalletService.creditOnPayment(order, t);

        await t.commit();
      } catch (invErr) {
        await t.rollback();
        console.error(`❌ Post-payment processing failed for order ${order.id}:`, invErr.message);
      }

      if (order.shippingMethod === "SHIPPING") {
        try {
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
        } catch (logisticsError) {
          console.error(`❌ Logistics failure for order ${order.id}:`, logisticsError.message);
        }
      }
    }

    return { order, verified };
  }

  async getInvoice(orderId, userId) {
    const order = await Order.findByPk(orderId, {
      attributes: ["id", "userId", "totalAmount", "shippingFee", "discountAmount", "status", "logisticsStatus", "createdAt"],
      include: [
        {
          model: OrderItem,
          as: "items",
          attributes: ["id", "quantity", "price", "subtotal"],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name"],
              include: [{
                model: ProductImage,
                as: "images",
                attributes: ["url"],
              }],
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
          attributes: ["id", "amount", "status", "paymentMethod"],
        },
      ],
    });

    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized access to this order");

    return {
      order: {
        id:              order.id,
        totalAmount:     order.totalAmount,
        shippingFee:     order.shippingFee,
        discountAmount: order.discountAmount,
        status:          order.status,
        logisticsStatus: order.logisticsStatus,
        createdAt:       order.createdAt,
      },
      items: order.items.map(item => ({
        id:       item.id,
        quantity: item.quantity,
        price:    item.price,
        subtotal: item.subtotal,
        product: {
          id:    item.product?.id,
          name:  item.product?.name,
          image: item.product?.images?.[0]?.url || null,
        },
        fulfillments: item.fulfillments
      })),
      payment: order.payment,
    };
  }
}

module.exports = new OrderServices();
