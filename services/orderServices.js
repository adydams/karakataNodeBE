const { use } = require("passport");
const { sequelize, Order, OrderItem, Cart, CartItem, Product } = require("../models");
const PaymentService = require("./paymentServices");

class OrderServices {
  /**
   * Create an order (with items already provided or from cart).
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

    // 3. Initialize payment
    try {
      const payment = await PaymentService.initialize({
        amount: totalAmount,
        email,
        gateway,
      });

      await order.update({ paymentReference: payment.reference }, { transaction });

      return { order, paymentUrl: payment.paymentUrl };
    } catch (err) {
      throw new Error(`Payment initialization failed: ${err.message}`);
    }
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
  async checkout(userId, { shippingAddress, phone, notes, gateway, email }) {
     
    const t = await sequelize.transaction();
    try {
      const cart = await Cart.findOne({
        where: { userId }, // filter by the userId column on Cart
        include: [
          {
            model: CartItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
              },
            ],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
      }
      console.log("********* order service");
     
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

      const { order, paymentUrl } = await this.create(
        userId,
        { items, totalAmount, shippingAddress, phone, notes, gateway, email },
        t
      );

      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      await t.commit();
      return { order, paymentUrl };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new OrderServices();
