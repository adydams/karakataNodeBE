// controllers/orderController.js
const OrderServices = require("../services/orderServices");

class OrderController {
  async checkout(req, res) {
    try {
      const userId = req.user.id; // ✅ pulled from JWT
      const { shippingAddressId, phone, notes, gateway } = req.body;

      const result = await OrderServices.checkout(userId, {
        shippingAddressId,
        phone,
        notes,
        gateway,
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  async verify(req, res) {
    try {
      const { orderId } = req.params;
      const result = await OrderServices.verify(orderId);
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
}

module.exports = new OrderController();
