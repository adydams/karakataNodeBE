// // models/index.js
// const { Sequelize, DataTypes } = require("sequelize");
// // const config = require("../db/database"); // your db config file

// // const sequelize = new Sequelize(config.database, config.username, config.password, config);
// const sequelize = require("../db/database");

// // Import models (functions, not yet initialized)
// const Product = require("./productModel");
// const Favorite = require("./favoriteModel");
// const ProductImage = require("./imageModel");
// const Category = require("./categoryModel");
// const Cart = require("./cartModel");
// const CartItem = require("./cartItemModel");
// const Order = require("./orderModel");
// const OrderItem = require("./orderItemModel");
// const UserModel = require("./userModel");

// // // Initialize models with sequelize + DataTypes
// // const Product = ProductModel(sequelize, DataTypes);
// // const Favorite = FavoriteModel(sequelize, DataTypes);
// // const ProductImage = ProductImageModel(sequelize, DataTypes);
// // const Category = CategoryModel(sequelize, DataTypes);
// // const Cart = CartModel(sequelize, DataTypes);
// // const CartItem = CartItemModel(sequelize, DataTypes);
// // const Order = OrderModel(sequelize, DataTypes);
// // const OrderItem = OrderItemModel(sequelize, DataTypes);
// // const User = UserModel(sequelize, DataTypes);

// // ================= ASSOCIATIONS =================

// // Product ↔ Category
// Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
// Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

// // Product ↔ ProductImage
// Product.hasMany(ProductImage, { foreignKey: "productId", as: "images", onDelete: "CASCADE" });
// ProductImage.belongsTo(Product, { foreignKey: "productId", as: "product" });

// // Product ↔ Favorite
// Product.hasMany(Favorite, { foreignKey: "productId", as: "favorites" });
// Favorite.belongsTo(Product, { foreignKey: "productId", as: "product" });

// // Cart ↔ User
// Cart.belongsTo(User, { foreignKey: "userId" });
// Cart.hasMany(CartItem, { foreignKey: "cartId", onDelete: "CASCADE" });

// // CartItem ↔ Product
// CartItem.belongsTo(Cart, { foreignKey: "cartId" });
// CartItem.belongsTo(Product, { foreignKey: "productId" });

// // Order ↔ User
// Order.belongsTo(User, { foreignKey: "userId" });
// Order.hasMany(OrderItem, { foreignKey: "orderId", onDelete: "CASCADE" });

// // OrderItem ↔ Product
// OrderItem.belongsTo(Order, { foreignKey: "orderId" });
// OrderItem.belongsTo(Product, { foreignKey: "productId" });

// module.exports = {
//   sequelize,
//   Sequelize,
//   Product,
//   Favorite,
//   ProductImage,
//   Category,
//   Cart,
//   CartItem,
//   Order,
//   OrderItem,
//   User
// };


// models/index.js
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db/database");

// Import all models
const Product = require("./productModel");
const Favorite = require("./favoriteModel");
const ProductImage = require("./imageModel");
const Category = require("./categoryModel");
const Cart = require("./cartModel");
const CartItem = require("./cartItemModel");
const Order = require("./orderModel");
const OrderItem = require("./orderItemModel");
const User = require("./userModel");

// Validate that all imports are proper Sequelize models
const models = {
  Product,
  Favorite,
  ProductImage,
  Category,
  Cart,
  CartItem,
  Order,
  OrderItem,
  User
};

// Check each model
Object.entries(models).forEach(([name, model]) => {
  if (!model || typeof model.hasMany !== 'function') {
    throw new Error(`${name} is not a valid Sequelize model. Check the export in ${name.toLowerCase()}Model.js`);
  }
  console.log(`✓ ${name} model loaded successfully`);
});

// ================= ASSOCIATIONS =================
try {
  // Product ↔ Category
  Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
  Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

  // Product ↔ ProductImage
  Product.hasMany(ProductImage, { foreignKey: "productId", as: "images", onDelete: "CASCADE" });
  ProductImage.belongsTo(Product, { foreignKey: "productId", as: "product" });

  // Product ↔ Favorite
  Product.hasMany(Favorite, { foreignKey: "productId", as: "favorites" });
  Favorite.belongsTo(Product, { foreignKey: "productId", as: "product" });

  // User ↔ Favorite (assuming users can have favorites)
  User.hasMany(Favorite, { foreignKey: "userId", as: "favorites" });
  Favorite.belongsTo(User, { foreignKey: "userId", as: "user" });

  // User ↔ Cart
  User.hasOne(Cart, { foreignKey: "userId", as: "cart" });
  Cart.belongsTo(User, { foreignKey: "userId", as: "user" });

  // Cart ↔ CartItem
  Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items", onDelete: "CASCADE" });
  CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cart" });

  // CartItem ↔ Product
  CartItem.belongsTo(Product, { foreignKey: "productId", as: "product" });
  Product.hasMany(CartItem, { foreignKey: "productId", as: "cartItems" });

  // User ↔ Order
  User.hasMany(Order, { foreignKey: "userId", as: "orders" });
  Order.belongsTo(User, { foreignKey: "userId", as: "user" });

  // Order ↔ OrderItem
  Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
  OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  // OrderItem ↔ Product
  OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });
  Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });

  console.log('✓ All model associations created successfully');

} catch (error) {
  console.error('Error creating model associations:', error);
  throw error;
}

module.exports = {
  sequelize,
  Sequelize,
  Product,
  Favorite,
  ProductImage,
  Category,
  Cart,
  CartItem,
  Order,
  OrderItem,
  User
};