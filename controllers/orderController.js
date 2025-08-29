// controllers/orderController.js
import OrderService from "../services/orderServices.js";

export const createOrder = async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, gateway, email } = req.body;
    const result = await OrderService.createOrder(req.user.id, { items, totalAmount, shippingAddress, gateway, email });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await OrderService.verifyOrderPayment(orderId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
