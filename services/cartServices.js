const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemModel");

exports.createCart = async (userId) => {
  return await Cart.create({ userId });
};


exports.getCartById = async (id) => {
  const cart = await Cart.findByPk(id, {
    include: [
      {
        model: CartItem,
        as: "items", // must match alias in association
      },
    ],
  });

  if (!cart) return null;

  // ✅ calculate total amount
  const totalAmount = cart.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return { 
    ...cart.toJSON(), 
    totalAmount 
  };
};


exports.deleteCart = async (id) => {
  const deleted = await Cart.destroy({ where: { id } });
  return deleted > 0; // returns true if deleted
};

 // Handle clearing all items from a cart (internal helper)
  exports.clearCart = async (cartId) => {
    await CartItem.destroy({
      where: { cartId },
    });
    return { message: "Cart cleared successfully" };
  }
