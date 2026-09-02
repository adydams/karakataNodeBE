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
const Role = require("./roleModel");
const Permission = require("./permissionModel");
const Address = require("./addressModel");
const StorePickupStation = require("./StorePickupStation");
const AuditLog = require("./auditLogModel");
const Discount = require("./DiscountModel");
const Inventory = require("./inventoryModel");
const Notification = require("./notificationModels");
const ProductPickupStation = require("./ProductPickupStationModel");
const OrderItemFulfillment = require("./orderItemFulfillmentModel");
const Shipment = require("./shipmentModel");
const ShipmentEvent = require("./shipmentEventModel");
const ProductDiscount = require("./productDiscountModel");
const ShippingProvider = require("./shippingProviderModel");

// Marketplace Models
const SystemSetting = require("./systemSettingModel");
const Wallet = require("./walletModel");
const WalletTransaction = require("./walletTransactionModel");
const Payout = require("./payoutModel");
const ReturnRequest = require("./returnRequestModel");

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
  Brand,
  SubCategory,
  Store,
  Address,
  StorePickupStation,
  Role,
  Permission,
  AuditLog,
  Discount,
  Inventory,
  Notification,
  ProductPickupStation,
  OrderItemFulfillment,
  Shipment,
  ShipmentEvent,
  ProductDiscount,
  ShippingProvider,
  SystemSetting,
  Wallet,
  WalletTransaction,
  Payout,
  ReturnRequest,
};

// Check each model
Object.entries(models).forEach(([name, model]) => {
  if (!model || typeof model.hasMany !== 'function') {
    throw new Error(`${name} is not a valid Sequelize model. Check the export in ${name.toLowerCase()}Model.js`);
  }
});

// ================= ASSOCIATIONS =================
try {
  // Product ↔ Category
  Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
  Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

  // Product ↔ ProductImage
  Product.hasMany(ProductImage, { foreignKey: "productId", as: "images", onDelete: "CASCADE" });
  ProductImage.belongsTo(Product, { foreignKey: "productId", as: "product" });

  // ================= INVENTORY =================
  Product.hasMany(Inventory, { foreignKey: "productId", as: "inventories", onDelete: "CASCADE" });
  Inventory.belongsTo(Product, { foreignKey: "productId", as: "product" });

  StorePickupStation.hasMany(Inventory, { foreignKey: "pickupStationId", as: "inventories" });
  Inventory.belongsTo(StorePickupStation, { foreignKey: "pickupStationId", as: "pickupStation" });

  // Product ↔ Favorite
  Product.hasMany(Favorite, { foreignKey: "productId", as: "favorites" });
  Favorite.belongsTo(Product, { foreignKey: "productId", as: "product" });

  // User ↔ Favorite
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
  OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });
  Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });

  OrderItem.hasMany(OrderItemFulfillment, { foreignKey: "orderItemId", as: "fulfillments" });
  OrderItemFulfillment.belongsTo(OrderItem, { foreignKey: "orderItemId", as: "orderItem" });
  OrderItemFulfillment.belongsTo(StorePickupStation, { foreignKey: "pickupStationId", as: "pickupStation" });
  OrderItem.belongsTo(StorePickupStation, { foreignKey: "pickupStationId", as: "pickupStation" });

  // Order ↔ Discount (Global Order Discount)
  Order.belongsTo(Discount, { foreignKey: "discountId", as: "globalDiscount" });
  Discount.hasMany(Order, { foreignKey: "discountId", as: "orders" });

  // OrderItem ↔ ProductDiscount (Specific Item Discount at time of purchase)
  OrderItem.belongsTo(ProductDiscount, { foreignKey: "productDiscountId", as: "itemDiscount" });
  ProductDiscount.hasMany(OrderItem, { foreignKey: "productDiscountId", as: "orderItems" });

  // Product ↔ ProductDiscount (Current active discounts for a product)
  Product.hasMany(ProductDiscount, { foreignKey: "productId", as: "discounts" });
  ProductDiscount.belongsTo(Product, { foreignKey: "productId", as: "product" });

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

  Product.belongsToMany(StorePickupStation, {
    through: ProductPickupStation,
    foreignKey: "productId",
    otherKey: "pickupStationId",
    as: "pickupStations",
  });

  StorePickupStation.belongsToMany(Product, {
    through: ProductPickupStation,
    foreignKey: "pickupStationId",
    otherKey: "productId",
    as: "products",
  });

  ProductPickupStation.belongsTo(Product, { foreignKey: "productId" });
  ProductPickupStation.belongsTo(StorePickupStation, { foreignKey: "pickupStationId", as: "station" });
  ProductPickupStation.hasOne(Inventory, { foreignKey: "pickupStationId", sourceKey: "pickupStationId", as: "inventory" });

  Product.belongsTo(StorePickupStation, {
    foreignKey: "pickupStationId",
    as: "pickupStation",
  });

  Payment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Order.hasOne(models.Payment, { foreignKey: "orderId", as: "payment" });
  Payment.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });

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

  Role.hasMany(User, { foreignKey: "roleId", as: "users" });
  User.belongsTo(Role, { foreignKey: "roleId", as: "role" });
  AuditLog.belongsTo(User, { foreignKey: "userId", as: "user" });

  // ================= DISCOUNT =================
  // Associations handled in the main block above

  User.hasMany(Discount, { foreignKey: "createdBy", as: "createdDiscounts" });
  Discount.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // ================= NOTIFICATION =================
  User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

  Order.hasMany(Notification, { foreignKey: "orderId", as: "notifications" });
  Notification.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  // ================= MARKETPLACE & WALLET =================

  // Shipment Associations
  Shipment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Shipment.belongsTo(ShippingProvider, { foreignKey: 'providerId', as: 'shippingProvider' });
  Shipment.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });
  User.hasMany(Shipment, { foreignKey: 'driverId', as: 'shipments' });

  ShipmentEvent.belongsTo(Shipment, { foreignKey: 'shipmentId', as: 'shipment' });
  Shipment.hasMany(ShipmentEvent, { foreignKey: 'shipmentId', as: 'events' });

  // Wallet ↔ Store
  Store.hasOne(Wallet, { foreignKey: "storeId", as: "wallet" });
  Wallet.belongsTo(Store, { foreignKey: "storeId", as: "store" });

  // WalletTransaction ↔ Wallet
  Wallet.hasMany(WalletTransaction, { foreignKey: "walletId", as: "transactions" });
  WalletTransaction.belongsTo(Wallet, { foreignKey: "walletId", as: "wallet" });

  // WalletTransaction ↔ Store
  Store.hasMany(WalletTransaction, { foreignKey: "storeId", as: "walletTransactions" });
  WalletTransaction.belongsTo(Store, { foreignKey: "storeId", as: "store" });

  // WalletTransaction ↔ OrderItem
  OrderItem.hasMany(WalletTransaction, { foreignKey: "orderItemId", as: "walletTransactions" });
  WalletTransaction.belongsTo(OrderItem, { foreignKey: "orderItemId", as: "orderItem" });

  // WalletTransaction ↔ Order
  Order.hasMany(WalletTransaction, { foreignKey: "orderId", as: "walletTransactions" });
  WalletTransaction.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  // WalletTransaction ↔ ReturnRequest
  // Removed duplicate association using returnRequestId to fix SequelizeAssociationError
  // ReturnRequest.hasOne(WalletTransaction, { foreignKey: "returnRequestId", as: "walletTransaction" });
  // WalletTransaction.belongsTo(ReturnRequest, { foreignKey: "returnRequestId", as: "returnRequest" });

  // Payout ↔ Store
  Store.hasMany(Payout, { foreignKey: "storeId", as: "payouts" });
  Payout.belongsTo(Store, { foreignKey: "storeId", as: "store" });

  // Payout ↔ Wallet
  Wallet.hasMany(Payout, { foreignKey: "walletId", as: "payouts" });
  Payout.belongsTo(Wallet, { foreignKey: "walletId", as: "wallet" });

  // ReturnRequest ↔ Order
  ReturnRequest.belongsTo(Order, { foreignKey: "orderId", as: "order" });
  Order.hasMany(ReturnRequest, { foreignKey: "orderId", as: "returnRequests" });

  // ReturnRequest ↔ OrderItem
  ReturnRequest.belongsTo(OrderItem, { foreignKey: "orderItemId", as: "orderItem" });
  OrderItem.hasMany(ReturnRequest, { foreignKey: "orderItemId", as: "returnRequests" });

  // ReturnRequest ↔ User (Customer)
  ReturnRequest.belongsTo(User, { foreignKey: "customerId", as: "customer" });
  User.hasMany(ReturnRequest, { foreignKey: "customerId", as: "returnRequests" });

  // ReturnRequest ↔ Store
  ReturnRequest.belongsTo(Store, { foreignKey: "storeId", as: "store" });
  Store.hasMany(ReturnRequest, { foreignKey: "storeId", as: "returnRequests" });

  // ReturnRequest ↔ StorePickupStation
  ReturnRequest.belongsTo(StorePickupStation, { foreignKey: "pickupStationId", as: "pickupStation" });
  StorePickupStation.hasMany(ReturnRequest, { foreignKey: "pickupStationId", as: "returnRequests" });

  // ReturnRequest ↔ WalletTransaction
  ReturnRequest.belongsTo(WalletTransaction, { foreignKey: "walletTransactionId", as: "walletTransaction" });
  WalletTransaction.hasMany(ReturnRequest, { foreignKey: "walletTransactionId", as: "returnRequests" });

  // ReturnRequest ↔ User (ReviewedBy)
  ReturnRequest.belongsTo(User, { foreignKey: "reviewedBy", as: "reviewer" });

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
  AuditLog,
  Discount,
  Inventory,
  Notification,
  ProductPickupStation,
  OrderItemFulfillment,
  Shipment,
  ShipmentEvent,
  ProductDiscount,
  ShippingProvider,
  SystemSetting,
  Wallet,
  WalletTransaction,
  Payout,
  ReturnRequest,
};
