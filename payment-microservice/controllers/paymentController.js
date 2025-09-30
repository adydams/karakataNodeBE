const { producer } = require("..");
const PaymentServices = require("../services/paymentServices");

class PaymentController {
  static async initializePayment(req, res) {
    try {
      const { orderId, userId, amount, email, gateway, redirectUrl } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: "You are unauthorized" 
        });
      }
        if (!orderId || !userId || !amount || !email || !gateway) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }

      const result = await PaymentServices.initialize({
        orderId,
        userId,
        amount,
        email,
        gateway,
        redirectUrl,
      });

      // Send to Kafka if producer is available
      if (producer) {
        await producer.send({
          topic: "payment-successful",
          messages: [
            {
              value: JSON.stringify({ userId, orderId }),
            },
          ],
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error("Initialize Payment Error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async verifyPayment(req, res) {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ success: false, message: "Reference is required" });
      }

      const verificationResult = await PaymentServices.verifyPayment(reference);

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: verificationResult,
      });
    } catch (err) {
      console.error("Verify Payment Error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async handlePaystackWebhook(req, res) {
    try {
      await PaymentServices.handleWebhookPaystack(
        JSON.stringify(req.body),
        req.headers["x-paystack-signature"]
      );
      res.sendStatus(200); // Must be 200 for Paystack to stop retries
    } catch (err) {
      console.error("Paystack Webhook Error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async handleFlutterwaveWebhook(req, res) {
    try {
      await PaymentServices.handleWebhookFlutterwave(
        JSON.stringify(req.body),
        req.headers["verif-hash"] // Flutterwave signature header
      );
      res.sendStatus(200); // Flutterwave expects 200 to stop retries
    } catch (err) {
      console.error("Flutterwave Webhook Error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = PaymentController;
