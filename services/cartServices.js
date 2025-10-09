const Cart = require("../models/cartModel");
const CartItem = require("../models/cartItemModel");
const Product =require("../models/productModel");
const ProductImage = require("../models/imageModel");

exports.createCart = async (userId) => {
  try {
    // Check if user already has an active or deleted cart
    const existingCart = await Cart.findOne({
    where: { userId }, // ✅ only carts not deleted
  });
    if (existingCart.isDeleted == true) {
      // If existing cart is marked deleted, restore it
      if (existingCart.isDeleted) {
        existingCart.isDeleted = false;
        await existingCart.save();
        return existingCart;
      }

      // If not deleted, just return the existing one
      return existingCart;
    }

    // Otherwise, create a new cart
    const newCart = await Cart.create({ userId });
    return newCart;
  } catch (error) {
    console.error("Error creating cart:", error);
    throw error;
  }
};



exports.getCartById = async (id) => {
  try {
    // Use findOne instead of findByPk to support conditions
    const cart = await Cart.findOne({
      where: { id, isDeleted: false },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "price", "description"],
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  attributes: ["url"], // ✅ include only the image URL
                },
              ],
            },
          ],
        },
      ],
    });

    if (!cart) {
      return null;
    }

    // Calculate total amount
    let totalAmount = 0;
    cart.items.forEach((item) => {
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
  const cart = await Cart.findByPk(id);

  if (!cart) return false;

  // Soft delete — instead of destroying, mark isDeleted = true
  await cart.update({ isDeleted: true });

  return true;
};

 // Handle clearing all items from a cart (internal helper)
  exports.clearCart = async (cartId) => {
    await CartItem.destroy({
      where: { cartId },
    });
    return { message: "Cart cleared successfully" };
  }
