

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
//const ShippingAddress = require("./shippingAddressModel");
const Role = require("./roleModel");
const Permission = require("./permissionModel");
const Address = require("./addressModel");
const StorePickupStation = require("./StorePickupStation");
const AuditLog = require("./auditLogModel");


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
 // ShippingAddress,
  Brand,
  SubCategory,
  Store,
  Address,
  StorePickupStation,
  Role,
  Permission,
  AuditLog,
};

// Check each model
Object.entries(models).forEach(([name, model]) => {
  if (!model || typeof model.hasMany !== 'function') {
    throw new Error(`${name} is not a valid Sequelize model. Check the export in ${name.toLowerCase()}Model.js`);
  }
  //console.log(`✓ ${name} model loaded successfully`);
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


  // Store ↔ User (owner)
  Store.belongsTo(User, {
    foreignKey: "ownerUserId",
    as: "owner",
  });

  Store.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator"
  });

  User.hasOne(Store, {
    foreignKey: "ownerUserId",
    as: "store",
  });

 // Product ↔ Store (nullable)
  Store.hasMany(Product, { as: "products", foreignKey: "storeId" });
  Product.belongsTo(Store, { as: "store", foreignKey: "storeId" });

  Store.hasMany(StorePickupStation, {
    foreignKey: "storeId",
    as: "pickupStations",
  });

  StorePickupStation.belongsTo(Store, {
    foreignKey: "storeId",
    as: "store",
  });

  StorePickupStation.hasMany(Product, {
    foreignKey: "pickupStationId",
    as: "products",
  });

  Product.belongsTo(StorePickupStation, {
    foreignKey: "pickupStationId",
    as: "pickupStation",
  });

  Payment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Order.hasOne(models.Payment, { foreignKey: "orderId", as: "payment" });
  Payment.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });

  // Order.hasOne(models.ShippingAddress, { foreignKey: "orderId", as: "shippingAddress" });
  // ShippingAddress.belongsTo(models.Order, { foreignKey: "orderId", as: "order",  onDelete: 'SET NULL', });
  // ShippingAddress.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
   

  User.hasMany(Address, { foreignKey: "userId", as: "addresses" });
    Address.belongsTo(User, { foreignKey: "userId", as: "user" });
   
    Address.hasMany(Order, { foreignKey: "shippingAddressId", as: "orders" });

  Order.belongsTo(Address, { foreignKey: "shippingAddressId", as: "shippingAddress" });
    Role.belongsToMany(Permission, {
      through: "RolePermissions",
      foreignKey: "roleId",
      as: "permissions",
    });
  Permission.belongsToMany(Role, {
      through: "RolePermissions",
      foreignKey: "permissionId",
      as: "roles",
    });
    

   User.hasMany(Permission, {
      foreignKey: "createdBy",
      as: "createdPermissions",
    });

    Permission.belongsTo(User, {
      foreignKey: "createdBy",
      as: "creator",
    }); 

 // 🟢 User ↔ Role (one-to-many)
  Role.hasMany(User, { foreignKey: "roleId", as: "users" });
  User.belongsTo(Role, { foreignKey: "roleId", as: "role" });
  AuditLog.belongsTo(User, { foreignKey: "userId", as: "user" });
  //console.log('✓ All model associations created successfully');

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
  User,
  Payment,
  Brand,
  Address,
  StorePickupStation,
  Role,
  Permission,
  SubCategory,
  Store,
  AuditLog
};