// 

const { sequelize, Order, OrderItem, Cart, CartItem, Product } = require("../models");
const { publishOrderCreated } = require("../messagingEvents/kafka/producer");

class OrderServices {
  /**
   * Create an order (DB only)
   */
  async create(userId, { items, totalAmount, shippingAddressId, phone, notes, gateway, email }, transaction) {
    // 1. Create order
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

    // 2. Add order items
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

    // 3. Publish OrderCreated → Kafka
    await publishOrderCreated({
      orderId: order.id,
      userId,
      amount: totalAmount,
      email,
      gateway,
      redirectUrl: process.env.FRONTEND_URL + "/payment/callback",
    });

    return { order };
  }

  /**
   * Checkout from Cart → Creates Order + Publish event
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

      const { order } = await this.create(
        userId,
        { items, totalAmount, shippingAddressId, phone, notes, gateway, email },
        t
      );

      // clear cart after order created
      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      await t.commit();

      // 🚨 PaymentUrl will come later from Payment Service → through event or API
      return { order };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new OrderServices();
