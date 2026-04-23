const OrderServices = require("../services/orderServices");

class OrderController {
  /**
   * Checkout (create order + init payment)
   */
  async checkout(req, res) {
    try {
      const userId = req.user?.id ; // 👈 replace with real auth
      const { shippingAddressId, gateway, email } = req.body;
      //console.log("🟢 CHECKOUT START");
      //console.log("User:", userId);
      //console.log("Payload:", req.body);
      const { order, paymentUrl } = await OrderServices.checkout(userId, {
        shippingAddressId,
        gateway,
        email,
        phone: req.body.phone,
        notes: req.body.notes,
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


async getInvoice(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    //console.log("🧾 Controller hit:", orderId);

    const order = await OrderServices.getInvoice(orderId, userId);

    res.json({
      success: true,
      data: order
    });

  } catch (err) {
    console.error("❌ Invoice error:", err.message);

    res.status(400).json({
      success: false,
      message: err.message
    });
  }
}
}
module.exports = new OrderController();
