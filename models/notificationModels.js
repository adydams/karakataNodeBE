const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Notification = sequelize.define("Notification", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: "users", key: "id" },
  },
  type: {
    type: DataTypes.ENUM(
      "ORDER_PLACED",
      "ORDER_PAID",
      "ORDER_SHIPPED",
      "ORDER_DELIVERED",
      "ORDER_ITEM_APPROVAL_REQUIRED",
      "ORDER_ITEM_APPROVAL_MISSED",
      "REFUND_FAILED",
      "PRODUCT_APPROVAL_SLA_OVERDUE",
      "LOW_STOCK",
      "DISCOUNT_APPLIED",
      "GENERAL",
      "SHIPMENT_PICKED_UP",
      "SHIPMENT_IN_TRANSIT",
      "SHIPMENT_FAILED"
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "e.g. { orderId, productId } for deep-linking",
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "notifications",
  timestamps: true,
});

module.exports = Notification;