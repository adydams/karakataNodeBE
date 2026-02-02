// controllers/paymentController.js
const PaymentService = require("../services/paymentServices");
const { Order, User } = require("../models");

class PaymentController {
  static async initialize(req, res) {
    try {
      const { orderId, gateway } = req.body;
      const userId = req.user.id;

      const order = await Order.findByPk(orderId);
      const user = await User.findByPk(userId);

      console.log("Initializing payment for order:", orderId, "by user:", userId);
      console.log("Order:", order);
      console.log("User:", user);
      if (!order) return res.status(404).json({ message: "Order not found" });

      const { paymentUrl, payment } = await PaymentService.initializePayment({
        order, user, gateway
      });

      res.status(200).json({ paymentUrl, payment });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async verify(req, res) {
    try {
      const { gateway, reference } = req.query;

      const isSuccess = await PaymentService.verifyPayment(gateway, reference);

      res.status(200).json({
        success: isSuccess,
        message: isSuccess ? "Payment verified successfully" : "Payment verification failed"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = PaymentController;
