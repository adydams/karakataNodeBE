const { use } = require("passport");
const { sequelize, Order, OrderItem, Cart, CartItem, Product, User, Payment, ProductImage, Address } = require("../models");
const PaymentService = require("./paymentServices");
const LogisticsService = require("./logisticsService");
class OrderServices {
  

 async create(userId, { items, totalAmount, shippingAddressId, phone, notes, gateway, shippingMethod, logisticsRequestToken, logisticsServiceCode, logisticsCourierId, shippingFee }, transaction) {
  if (shippingMethod === "SHIPPING" && !shippingAddressId) {
    throw new Error("Shipping address is required for dropoff");
  }

  const user = await User.findByPk(userId, { transaction });
  if (!user) throw new Error("User not found");

  let shippingAddress = null;

  if (shippingMethod.ToLower() === "dropoff") {
    shippingAddress = await Address.findByPk(
      shippingAddressId,
      { transaction: t }
    );

    if (!shippingAddress) {
      throw new Error("Shipping address not found");
    }
  }
  const order = await this.create(
  userId,
  {
    items,
    totalAmount,
    shippingAddressId,

    // snapshot fields
    shippingFullName: user.name || user.fullName,
    shippingPhone: phone || user.phone,

    shippingAddressLine1: shippingAddress?.addressLine1,
    shippingAddressLine2: shippingAddress?.addressLine2,
    shippingCity: shippingAddress?.city,
    shippingState: shippingAddress?.state,
    shippingPostalCode: shippingAddress?.postalCode,
    shippingCountry: shippingAddress?.country,

    phone,
    notes,
    gateway,
    shippingMethod,

    logisticsRequestToken: requestToken,
    logisticsServiceCode: serviceCode,
    logisticsCourierId: courierId,
    shippingFee,
  },
  t
);
   //console.log("✅ Order created:", order.id);
  //console.log("💰 Total:", totalAmount); 
  for (const item of items) {
    await OrderItem.create(
      {
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      },
      { transaction }
    );
  }

  return order; // ✅ ONLY return order
}


  /**
   * Verify payment
   */
  async verify(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    const verified = await PaymentService.verifyPayment({
      reference: order.paymentReference,
      gateway: order.paymentGateway,
    });

    order.status = verified ? "PAID" : "FAILED";
    await order.save();

    if (verified && order.shippingMethod === "SHIPPING") {
      try {
        await LogisticsService.createShipment({
          orderId: order.id,
          requestToken: order.logisticsRequestToken,
          serviceCode: order.logisticsServiceCode,
          courierId: order.logisticsCourierId,
          courierName: null, // will be fetched from ShipBubble response in createShipment
          shippingFee: order.shippingFee,
          trackingLevel: null,
          deliveryEta: null,
          insuranceCode: null,
        });
      } catch (logisticsError) {
        console.error(`❌ Logistics failure for order ${order.id}:`, logisticsError.message);
        // We don't fail the payment verification just because logistics booking failed.
        // The order is still PAID. An admin can manually retry or it can be handled by a worker.
      }
    }

    return { order, verified };
  }

  // /**
  //  * Checkout → from cart
  //  */
  //   async checkout(userId, { shippingAddressId, phone, notes, gateway, email, shippingMethod, requestToken, serviceCode, courierId }) {
  //   const t = await sequelize.transaction();

  //   try {
  //     const cart = await Cart.findOne({
  //       where: { userId },
  //       include: [
  //         {
  //           model: CartItem,
  //           as: "items",
  //           include: [{ model: Product, as: "product" }],
  //         },
  //       ],
  //       transaction: t,
  //       lock: t.LOCK.UPDATE,
  //     });

  //     if (!cart || cart.items.length === 0) {
  //       throw new Error("Cart is empty");
  //     }

  //     const rateData = await ShipBubbleAdapter.getRates({
  //         requestToken,
  //       });

  //       const courier = rateData.couriers.find(c => c.id === courierId);

  //       if (!courier) {
  //         throw new Error("Invalid courier selected");
  //       }

  //       const shippingFee = courier.fee;



      
  //     let totalAmount = 0;
  //     const items = cart.items.map((item) => {
  //       const subtotal = item.quantity * item.product.price;
  //       totalAmount += subtotal;
  //       return {
  //         productId: item.productId,
  //         productName: item.product.name,
  //         unitPrice: item.product.price,
  //         quantity: item.quantity,
  //         subtotal,
  //       };
  //     });

  //     // ✅ 1. Create order inside transaction
  //     const order = await this.create(
  //       userId,
  //       {
  //         items,
  //         totalAmount,
  //         shippingAddressId,
  //         phone,
  //         notes,
  //         gateway,
  //         shippingMethod,
  //         logisticsRequestToken: requestToken,
  //         logisticsServiceCode: serviceCode,
  //         logisticsCourierId: courierId,
  //         shippingFee,
  //       },
  //       t
  //     );

  //     await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

  //     // ✅ 2. COMMIT FIRST
  //     await t.commit();

  //     // ✅ 3. Fetch user (outside transaction)
  //     const user = await User.findByPk(userId);

  //     // ✅ 4. Initialize payment (outside transaction)
  //     const paymentInit = await PaymentService.initialize({
  //       order,
  //       user,
  //       gateway,
  //       redirectUrl: process.env.BACKEND_BASE_URL,
  //     });

  //     // ✅ 5. Update order with reference
  //     await order.update({
  //       paymentReference: paymentInit.payment.reference,
  //     });

  //     return {
  //       order,
  //       paymentUrl: paymentInit.paymentUrl,
  //     };

  //   } catch (err) {
  //     await t.rollback();
  //     throw err;
  //   }
  // }


  async checkout(userId, {
  shippingAddressId,
  phone,
  notes,
  gateway,
  email,
  shippingMethod,
  requestToken,
  serviceCode,
  courierId,
  // ❌ Remove shippingFee from trusted input — we calculate it server-side
}) {

  // ✅ STEP 1: Fetch user
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  // ✅ STEP 2: Validate address + build snapshot
  let address = null;
  let shippingSnapshot = null;
  let shippingFee = 0;

  if (shippingMethod === "SHIPPING") {
    if (!shippingAddressId) throw new Error("Shipping address is required");
    if (!requestToken) throw new Error("Request token is required to verify shipping rate");
    if (!courierId) throw new Error("Courier selection is required");

    address = await Address.findOne({
      where: { id: shippingAddressId, userId, isDeleted: false },
    });

    if (!address) throw new Error("Shipping address not found");

    if (!address.shipbubbleAddressCode) {
      throw new Error("Address has not been validated for shipping. Please re-save your address.");
    }

    // ✅ STEP 3: Re-fetch rate from ShipBubble server-side
    // This prevents price manipulation from the browser
    let rateData;
    try {
      rateData = await ShipBubbleAdapter.getRates({ requestToken });
    } catch (err) {
      throw new Error("Unable to verify shipping rate. Please restart checkout.");
    }

    // ✅ STEP 4: Find the courier the user selected
    const selectedCourier = rateData?.couriers?.find(
      (c) => String(c.id) === String(courierId)
    );

    if (!selectedCourier) {
      throw new Error("Selected courier is no longer available. Please restart checkout.");
    }

    // ✅ STEP 5: Use server-calculated fee — never the client's value
    shippingFee = selectedCourier.fee;

    if (!shippingFee || shippingFee <= 0) {
      throw new Error("Invalid shipping fee returned from courier. Please restart checkout.");
    }

    // ✅ STEP 6: Build immutable snapshot
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
        fee: shippingFee,
        estimatedDays: selectedCourier.estimated_days || null,
      },
    };
  }

  // ✅ STEP 7: Open transaction only for DB writes
  const t = await sequelize.transaction();
  let committed = false;

  try {
    const cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // ✅ STEP 8: Calculate totals server-side
    let totalAmount = 0;
    const items = cart.items.map((item) => {
      if (!item.product) throw new Error(`Product not found for cart item ${item.id}`);

      const subtotal = item.quantity * item.product.price;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        productName: item.product.name,
        unitPrice: item.product.price,  // ✅ price from DB, not frontend
        quantity: item.quantity,
        subtotal,
      };
    });

    // ✅ Grand total = product total + server-verified shipping fee
    const grandTotal = totalAmount + shippingFee;

    // ✅ STEP 9: Create order
    const order = await this.create(
      userId,
      {
        items,
        totalAmount: grandTotal,
        shippingAddressId: address?.id || null,
        shippingSnapshot,
        phone,
        notes,
        gateway,
        shippingMethod,
        logisticsRequestToken: requestToken,
        logisticsServiceCode: serviceCode,
        logisticsCourierId: courierId,
        shippingFee,  // ✅ server-verified
      },
      t
    );

    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction: t,
    });

    await t.commit();
    committed = true;

    // ✅ STEP 10: Initialize payment
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

    return {
      order,
      paymentUrl: paymentInit.paymentUrl,
    };

  } catch (err) {
    if (!committed) await t.rollback();
    throw err;
  }
}

  async getInvoice(orderId, userId) {
  const order = await Order.findByPk(orderId, {
    attributes: ["id", "userId", "totalAmount", "status", "logisticsStatus", "createdAt"],
    include: [
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
                attributes: ["url"]
                // optional: limit: 1
              }
            ]
          }
        ]
      },
      {
        model: Payment,
        as: "payment",
        attributes: ["id", "amount", "status", "paymentMethod"]
      }
    ]
  });

  // ❌ Order not found
  if (!order) {
    throw new Error("Order not found");
  }

  // 🔒 Authorization check
  if (order.userId !== userId) {
    throw new Error("Unauthorized access to this order");
  }

  // ✅ Clean response
  return {
    order: {
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      logisticsStatus: order.logisticsStatus,
      createdAt: order.createdAt
    },

    items: order.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,

      product: {
        id: item.product?.id,
        name: item.product?.name,
        image: item.product?.images?.[0]?.url || null
      }
    })),

    payment: order.payment
  };
}
}

module.exports = new OrderServices();
