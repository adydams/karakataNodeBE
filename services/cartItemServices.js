const CartItem = require('../models/cartItemModel');
const Cart = require('../models/cartModel')
const Product = require('../models/productModel')

class CartItemServices {
  //  async addItems(cartId, items) {
  //   if (!Array.isArray(items) || items.length === 0) {
  //     throw new Error("Items array is required");
  //   }

  //   const cartItems = items.map(item => ({
  //     cartId,
  //     productId: item.productId,
  //     quantity: item.quantity || 1,
  //   }));

  //   return await CartItem.bulkCreate(cartItems);
  // }
   
// Handle a single item (internal helper)
async  addOrUpdateItem(cartId, productId, quantity = 1) {
  const existingItem = await CartItem.findOne({
    where: { cartId, productId },
  });

  if (existingItem) {
    existingItem.quantity += quantity;
    return await existingItem.save();
  } else {
    return await CartItem.create({ cartId, productId, quantity });
  }
}

// Handle multiple items
async addItems (cartId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items array is required");
  }

  const results = [];
  for (const item of items) {
    const { productId, quantity = 1 } = item;
    const result = await this.addOrUpdateItem(cartId, productId, quantity);
    results.push(result);
  }

  return results;
};

// (Optional) expose single-item method if needed
async addItemToCart (cartId, productId, quantity = 1) {
  return await this.addOrUpdateItem(cartId, productId, quantity);
};
  // async removeItem(id) {
  //   return CartItem.destroy({ where: { id } });
  // }

  async updateQuantity(id, quantity) {
    const [updated] = await CartItem.update(
    { quantity },
    { where: { id, isDeleted: false } }
  );

  if (!updated) {
    console.log('No record updated — invalid ID or already deleted.');
    return null;
  }

  return await CartItem.findByPk(id);
 }

  // async getCartItems(cartId) {
  // const cart = await Cart.findByPk(cartId, {
  //   include: [
  //     {
  //       model: CartItem,
  //       include: [
  //         {
  //           model: Product,
  //           attributes: ["id", "name", "price", "image"], // only required fields
  //         },
  //       ],
  //     },
  //   ],
  // });

  // return cart;
  // }
  async  getCartItems(cartId) {
    try {
      const cart = await Cart.findByPk(cartId, {
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
  }

 // Handle removing a single item (internal helper)
  async removeItem(cartId, productId, quantity = 1) {
    const existingItem = await CartItem.findOne({
      where: { cartId, productId },
    });

    if (!existingItem) {
      throw new Error("Item not found in cart");
    }

    if (existingItem.quantity > quantity) {
      // Reduce quantity
      existingItem.quantity -= quantity;
      return await existingItem.save();
    } else {
      // Remove item completely if quantity to remove >= existing quantity
      await existingItem.destroy();
      return null;
    }
  }
 

}

module.exports = new CartItemServices();
