const CartItem = require('../models/cartItemModel');

class CartItemServices {
  async addItem(cartId, productId, quantity = 1) {
    return CartItem.create({ cartId, productId, quantity });
  }

  async removeItem(id) {
    return CartItem.destroy({ where: { id } });
  }

  async updateQuantity(id, quantity) {
    return CartItem.update({ quantity }, { where: { id } });
  }

  async getCartItems(cartId) {
    return CartItem.findAll({
      where: { cartId },
      include: ['product'],
    });
  }
}

module.exports = new CartItemServices();
