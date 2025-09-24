const PaymentServices = require("../services/paymentServices");

class PaymentController {
  static async initializePayment(req, res) {
    try {
      const { orderId, userId, amount, email, gateway, redirectUrl } = req.body;
      const result = await PaymentServices.initialize({ orderId, userId, amount, email, gateway, redirectUrl });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async verifyPayment(req, res) {
    try {
      const { reference } = req.params;
      // call PaymentServices.verifyPayment (implement in service)
      res.status(200).json({ success: true, message: "Verified placeholder" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async handlePaystackWebhook(req, res) {
    try {
      await PaymentServices.handleWebhookPaystack(
        JSON.stringify(req.body),
        req.headers["x-paystack-signature"]
      );
      res.sendStatus(200);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async handleFlutterwaveWebhook(req, res) {
    try {
      // similar to paystack
      res.sendStatus(200);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = PaymentController;
