const OrderServices = require("../services/orderServices");

class OrderController {
  /**
   * Checkout (create order + init payment)
   */
  async checkout(req, res) {
    try {
      const userId = req.user?.id || 1; // 👈 replace with real auth
      const { shippingAddress, gateway, email } = req.body;

      const { order, paymentUrl } = await OrderServices.checkout(userId, {
        shippingAddress,
        gateway,
        email,
      });

      return res.status(201).json({
        success: true,
        message: "Order created, proceed to payment",
        order,
        paymentUrl,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * Verify order payment
   */
  async verify(req, res) {
    try {
      const { orderId } = req.params;

      const { order, verified } = await OrderServices.verify(orderId);

      return res.status(200).json({
        success: verified,
        message: verified
          ? "Payment verified successfully"
          : "Payment verification failed",
        order,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new OrderController();
