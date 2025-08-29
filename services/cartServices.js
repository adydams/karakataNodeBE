const { Cart, CartItem, Product } = require("../models");

class CartServices {
  async getCart(userId) {
    let cart = await Cart.findOne({ 
      where: { userId }, 
      include: { model: CartItem, as: "items", include: [Product] }
    });
    if (!cart) {
      cart = await Cart.create({ userId });
    }
    return cart;
  }

  async addItem(userId, productId, quantity = 1) {
    const cart = await this.getCart(userId);
    let item = await CartItem.findOne({ where: { cartId: cart.id, productId } });

    if (item) {
      item.quantity += quantity;
      await item.save();
    } else {
      item = await CartItem.create({ cartId: cart.id, productId, quantity });
    }
    return item;
  }

  async removeItem(userId, productId) {
    const cart = await this.getCart(userId);
    return await CartItem.destroy({ where: { cartId: cart.id, productId } });
  }

  async clearCart(userId) {
    const cart = await this.getCart(userId);
    return await CartItem.destroy({ where: { cartId: cart.id } });
  }
}

module.exports = new CartServices();
