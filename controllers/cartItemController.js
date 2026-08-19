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

  async updateQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be at least 1" });
      }

      const item = await cartItemService.updateQuantity(id, quantity);

      if (!item) {
        return res.status(404).json({ message: "Cart item not found or deleted" });
      }

      return res.json({
        message: "Quantity updated successfully",
        data: item,
      });
    } catch (error) {
      console.error("Error updating quantity:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
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
  async removeItem(req, res) {
    try {
      const { id } = req.params;
      const quantity = req.body?.quantity;

      if (quantity) {
        const item = await cartItemService.getCartItemById(id);
        if (!item) return res.status(404).json({ success: false, message: "Cart item not found" });

        const result = await cartItemService.removeItem(item.cartId, item.productId, quantity);
        if (!result) {
          return res.status(200).json({ success: true, message: "Item removed completely from cart" });
        }
        return res.status(200).json({ success: true, message: "Item quantity updated", data: result });
      } else {
        await cartItemService.removeById(id);
        return res.status(200).json({ success: true, message: "Item removed from cart" });
      }
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new CartItemController();
