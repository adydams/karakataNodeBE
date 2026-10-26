const { Cart, CartItem, Product, ProductImage, ProductDiscount } = require("../models");
const { calculateCurrentPrice } = require("../utils/priceHelper");
const auditService = require("./auditService");

exports.createCart = async (userId) => {
  try {
    // Check if user already has a cart (could be deleted)
    const existingCart = await Cart.findOne({
      where: { userId },
    });

    if (existingCart) {
      if (existingCart.isDeleted) {
        // If existing cart is marked deleted, restore it
        existingCart.isDeleted = false;
        await existingCart.save();
        return existingCart;
      }
      // This case is technically handled by the controller, but for safety:
      return existingCart;
    }

    // Otherwise, create a new cart
    const newCart = await Cart.create({ userId });
    await auditService.log({
      userId,
      action: "CART_CREATED",
      entityType: "Cart",
      entityId: newCart.id,
      newValue: { userId }
    });
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
              attributes: ["id", "name", "price", "description", "weightKg", "lengthCm", "widthCm", "heightCm", "logisticsCategoryId"],
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  attributes: ["url"],
                },
                {
                  model: ProductDiscount,
                  as: "discounts"
                }
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
    const cartJson = cart.toJSON();
    let totalAmount = 0;
    for (const [index, item] of cart.items.entries()) {
      if (item.product) {
        const pricing = await calculateCurrentPrice(item.product, item.quantity);
        Object.assign(cartJson.items[index].product, {
          currentPrice: pricing.finalPrice,
          originalPrice: pricing.originalPrice,
          isDiscounted: pricing.isDiscounted,
        });
        totalAmount += item.quantity * pricing.finalPrice;
      }
    }

    cartJson.totalAmount = Number(totalAmount.toFixed(2));

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
  await auditService.log({
    userId: cart.userId,
    action: "CART_DELETED",
    entityType: "Cart",
    entityId: cart.id,
    oldValue: { isDeleted: false },
    newValue: { isDeleted: true }
  });

  return true;
};

 // Handle clearing all items from a cart (internal helper)
  exports.clearCart = async (cartId) => {
    await CartItem.destroy({
      where: { cartId },
    });
    await auditService.log({
      userId: null,
      action: "CART_CLEARED",
      entityType: "Cart",
      entityId: cartId,
      newValue: { itemsCount: 0 }
    });
    return { message: "Cart cleared successfully" };
  }
