const cartService = require("../services/cartServices");

exports.getCart = async (req, res) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const item = await cartService.addItem(req.user.id, productId, quantity);
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.body;
    await cartService.removeItem(req.user.id, productId);
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
