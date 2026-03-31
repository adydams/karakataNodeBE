const { use } = require("passport");
const { sequelize, Order, OrderItem, Cart, CartItem, Product, User } = require("../models");
const PaymentService = require("./paymentServices");

class OrderServices {
  

 async create(userId, { items, totalAmount, shippingAddressId, phone, notes, gateway }, transaction) {
  if (!shippingAddressId) {
    throw new Error("Shipping address is required");
  }

  const user = await User.findByPk(userId, { transaction });
  if (!user) throw new Error("User not found");

  const order = await Order.create(
    {
      userId,
      totalAmount,
      shippingAddressId,
      phone,
      notes,
      paymentGateway: gateway,
      status: "PENDING",
    },
    { transaction }
  );

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

    return { order, verified };
  }

  /**
   * Checkout → from cart
   */
    async checkout(userId, { shippingAddressId, phone, notes, gateway, email }) {
    const t = await sequelize.transaction();

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

      let totalAmount = 0;
      const items = cart.items.map((item) => {
        const subtotal = item.quantity * item.product.price;
        totalAmount += subtotal;
        return {
          productId: item.productId,
          productName: item.product.name,
          unitPrice: item.product.price,
          quantity: item.quantity,
          subtotal,
        };
      });

      // ✅ 1. Create order inside transaction
      const order = await this.create(
        userId,
        { items, totalAmount, shippingAddressId, phone, notes, gateway },
        t
      );

      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      // ✅ 2. COMMIT FIRST
      await t.commit();

      // ✅ 3. Fetch user (outside transaction)
      const user = await User.findByPk(userId);

      // ✅ 4. Initialize payment (outside transaction)
      const paymentInit = await PaymentService.initialize({
        order,
        user,
        gateway,
        redirectUrl: process.env.BASE_URL,
      });

      // ✅ 5. Update order with reference
      await order.update({
        paymentReference: paymentInit.payment.reference,
      });

      return {
        order,
        paymentUrl: paymentInit.paymentUrl,
      };

    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new OrderServices();
