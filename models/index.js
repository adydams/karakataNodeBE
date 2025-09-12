

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
const Brand = require("./brandModel");
const SubCategory = require("./subCategoryModel");
const Store = require("./storeModel");
const Payment = require("./paymentModel");
const ShippingAddress = require("./shippingAddressModel");

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
  User,
  Payment,
  ShippingAddress
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

  // Associations
  Brand.hasMany(Product, { as: "products", foreignKey: "brandId" });
  Product.belongsTo(Brand, { foreignKey: "brandId", as: "brand" });


  // Category ↔ SubCategory
  Category.hasMany(SubCategory, { as: "subcategories", foreignKey: "categoryId" });
  SubCategory.belongsTo(Category, { foreignKey: "categoryId", as: "parentCategory" });


  // SubCategory ↔ Product
  SubCategory.hasMany(Product, { as: "products", foreignKey: "subCategoryId" });
  Product.belongsTo(SubCategory, { foreignKey: "subCategoryId", as: "subcategory" });

 // Product ↔ Store (nullable)
  Store.hasMany(Product, { as: "products", foreignKey: "storeId" });
  Product.belongsTo(Store, { as: "store", foreignKey: "storeId" });

   Payment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
   Order.hasOne(models.Payment, { foreignKey: "orderId", as: "payment" });
    Payment.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });

    Order.hasOne(models.ShippingAddress, { foreignKey: "orderId", as: "shippingAddress" });
    ShippingAddress.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });

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