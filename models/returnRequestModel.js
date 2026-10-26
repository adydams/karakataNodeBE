const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const ReturnRequest = sequelize.define(
  "ReturnRequest",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orderitems", key: "id" },
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "stores", key: "id" },
    },
    pickupStationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "store_pickup_stations", key: "id" },
    },
    walletTransactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "wallet_transactions", key: "id" },
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    evidence: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    faultParty: {
      type: DataTypes.ENUM("CUSTOMER", "STORE"),
      allowNull: true,
    },
    returnShippingBearer: {
      type: DataTypes.ENUM("CUSTOMER", "STORE"),
      allowNull: true,
    },
    returnShippingFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    restockConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refundReference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    returnRateRequestToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "return_requests",
    timestamps: true,
  }
);

module.exports = ReturnRequest;
