const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemModel");
const Product =require("../models/productModel")
exports.createCart = async (userId) => {
  return await Cart.create({ userId });
};


exports.getCartById = async (id) => {
   try {
      const cart = await Cart.findByPk(id, {
        include: [
          {
            model: CartItem,
            as: "items",   // alias from your associations
            include: [
              {
                model: Product,
                as: "product", // alias from CartItem.belongsTo(Product)
                attributes: ["id", "name", "price"],
              },
            ],
          },
        ],
      });

      if (!cart) {
        return null; // or throw error
      }

      // Calculate total amount
      let totalAmount = 0;
      cart.items.forEach(item => {
        if (item.product) {
          totalAmount += item.quantity * item.product.price;
        }
      });

      // Convert to plain object so we can add custom fields
      const cartJson = cart.toJSON();
      cartJson.totalAmount = totalAmount;

      return cartJson;
    } catch (error) {
      console.error("Error fetching cart items:", error);
      throw error;
    }
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
