// services/orderService.js
const { Order } = require("../models");
const PaymentService = require("./paymentServices");

class OrderServices {
  async create(userId, { items, totalAmount, shippingAddress, gateway, email }) {
    // Create order in DB
    const order = await Order.create({
      userId,
      totalAmount,
      paymentGateway: gateway,
      status: "pending",
      shippingAddress,
    });

    // Initialize payment
    const payment = await PaymentService.initializePayment({
      amount: totalAmount,
      email,
      gateway,
    });

    // Save reference in order
    await order.update({ paymentReference: payment.reference });

    return { order, paymentUrl: payment.paymentUrl };
  }

  async verify(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    const verified = await PaymentService.verifyPayment({
      reference: order.paymentReference,
      gateway: order.paymentGateway,
    });

    if (verified) {
      order.status = "paid";
      await order.save();
    }

    return { order, verified };
  }
}

module.exports = new OrderServices();
