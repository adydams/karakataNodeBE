const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemModel");

exports.createCart = async (userId) => {
  return await Cart.create({ userId });
};


exports.getCartById = async (id) => {
  return await Cart.findByPk(id, {
    include: [
      {
        model: CartItem,
        as: "items",   // ✅ must match the alias in Cart.hasMany()
      },
    ],
  });
};

exports.deleteCart = async (id) => {
  const deleted = await Cart.destroy({ where: { id } });
  return deleted > 0; // returns true if deleted
};
