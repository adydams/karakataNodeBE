const CartItem = require('../models/cartItemModel');
const Cart = require('../models/cartModel')
const Product = require('../models/productModel')
const { Inventory } = require('../models');
const { Op } = require('sequelize');

class CartItemServices {
  /**
   * Total sellable stock for a product across all stations
   * (quantityOnHand - quantityReserved, floored at 0 per station).
   */
  async getAvailableStock(productId) {
    const rows = await Inventory.findAll({
      where: { productId, isDeleted: false },
      attributes: ["quantityOnHand", "quantityReserved"],
    });
    return rows.reduce(
      (total, inv) => total + Math.max(Number(inv.quantityOnHand || 0) - Number(inv.quantityReserved || 0), 0),
      0
    );
  }

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
  const product = await Product.findByPk(productId);
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  const existingItem = await CartItem.findOne({
    where: { cartId, productId },
  });

  const requestedTotal = (existingItem ? existingItem.quantity : 0) + quantity;
  const availableStock = await this.getAvailableStock(productId);
  if (availableStock <= 0) {
    throw new Error(`${product.name} is out of stock`);
  }
  if (requestedTotal > availableStock) {
    throw new Error(
      `Only ${availableStock} unit(s) of ${product.name} available${existingItem ? ` (you already have ${existingItem.quantity} in your cart)` : ""}`
    );
  }

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
    const item = await CartItem.findOne({ where: { id, isDeleted: false } });
    if (!item) {
      return null;
    }

    if (Number(quantity) > 0) {
      const availableStock = await this.getAvailableStock(item.productId);
      if (Number(quantity) > availableStock) {
        throw new Error(`Only ${availableStock} unit(s) available`);
      }
    }

    await CartItem.update({ quantity }, { where: { id, isDeleted: false } });

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
  async getCartItemById(id) {
    return await CartItem.findByPk(id);
  }

  // Remove item by CartItem ID
  async removeById(id) {
    const item = await CartItem.findByPk(id);
    if (!item) throw new Error("Cart item not found");
    await item.destroy();
    return null;
  }

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
