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

      //console.log("Initializing payment for order:", orderId, "by user:", userId);
      //console.log("Order:", order);
      //console.log("User:", user);
      if (!order) return res.status(404).json({ message: "Order not found" });

      const { paymentUrl, payment } = await PaymentService.initializePayment({
        order, user, gateway
      });

      res.status(200).json({ paymentUrl, payment });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // static async verify(req, res) {
  //   try {
  //     const { gateway, reference } = req.query;

  //     const isSuccess = await PaymentService.verifyPayment(gateway, reference);

  //     res.status(200).json({
  //       success: isSuccess,
  //       message: isSuccess ? "Payment verified successfully" : "Payment verification failed"
  //     });
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // }

  static async verify(req, res) {
  try {
    //console.log("🔁 Verify endpoint hit");
    //console.log("Query:", req.query);
    const { gateway, reference, orderId } = req.query;

    const result = await PaymentService.verify({
      gateway,
      reference
    });
      //console.log("Verification result:", result);
    const order = await Order.findByPk(orderId);

    if (!order) throw new Error("Order not found");

    // ⚠️ DO NOT rely on this for truth (webhook already handled it)
    if (result.success) {
      order.status = "PAID";
      order.paymentStatus = "SUCCESS";
    } else {
      order.status = "FAILED";
      order.paymentStatus = "FAILED";
    }

    await order.save();
    //console.log("Order updated to:", order.status);
    //console.log("➡️ Redirecting to frontend with order:", order.id);
    // ✅ REDIRECT USER TO FRONTEND INVOICE PAGE
    return res.redirect(
      `https://karakatang.vercel.app/payment-success?orderId=${order.id}`
    );

  } catch (err) {
    console.error(err);
    return res.redirect(
      `https://karakatang.vercel.app/payment-failed`
    );
  }
}
  
}

module.exports = PaymentController;
