const cartItemService = require('../services/cartItemServices');

class CartItemController {
   async addItem(req, res) {
    try {
      const { cartId, items } = req.body;

      if (!cartId || !items) {
        return res
          .status(400)
          .json({ success: false, message: "cartId and items are required" });
      }

      const createdItems = await cartItemService.addItems(cartId, items);

      res.status(201).json({
        success: true,
        message: "Items added to cart successfully",
        data: createdItems,
      });
    } catch (error) {
      console.error("AddItem Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // async removeItem(req, res) {
  //   const { id } = req.params;
  //   await cartItemService.removeItem(id);
  //   res.status(204).send();
  // }

  async updateQuantity(req, res) {
    const { id } = req.params;
    const { quantity } = req.body;
    const item = await cartItemService.updateQuantity(id, quantity);
    res.json(item);
  }

  async getCartItems(req, res) {
    try {
    const { cartId } = req.params;

    const cart = await cartItemService.getCartItems(cartId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
  }

  // Remove a single item from the cart
async removeItem  (req, res)  {
  try {
    const { cartId, productId } = req.params;
    const { quantity } = req.body; // optional, defaults to 1

    const item = await cartService.removeItem(cartId, productId, quantity || 1);

    if (!item) {
      return res.status(200).json({
        success: true,
        message: "Item removed completely from cart",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item quantity updated",
      data: item,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};


}

module.exports = new CartItemController();
