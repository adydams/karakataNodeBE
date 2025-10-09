const cartService = require("../services/cartServices");

const CartItem = require("../models/cartItemModel");
const { Cart } = require("../models");

exports.createCart = async (req, res) => {
  try {
    
    const userId  = req.user.id;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required" });
    }
    
    const anyCart = await Cart.findOne({
        where: { 
          userId: userId,
          isDeleted: false }, // filter by userId column
      });
    if (anyCart) {
      return res.status(400).json({ success: false, error: "An active cart exist" });
    }
    const cart = await cartService.createCart(userId);

    res.status(201).json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCart = async (req, res) => {
  try {
    const { id } = req.params;
    const cart = await cartService.getCartById(id,{
      include :[{model: CartItem, as: "items"}]
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: "Cart not found" });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await cartService.deleteCart(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Cart not found" });
    }

    res.status(200).json({ success: true, message: "Cart deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Clear all items in a cart
 exports.clearCart = async (req, res) => {
  try {
    const { cartId } = req.params;

    await cartService.clearCart(cartId);

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};
