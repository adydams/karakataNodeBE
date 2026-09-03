const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "wallets", key: "id" },
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "orderitems", key: "id" },
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "orders", key: "id" },
    },
    returnRequestId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "return_requests", key: "id" },
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "stores", key: "id" },
    },
    type: {
      type: DataTypes.ENUM(
        "SALE_CREDIT",
        "PAYOUT_DEBIT",
        "REFUND_REVERSAL",
        "RETURN_SHIPPING_DEBIT",
        "ADJUSTMENT"
      ),
      allowNull: false,
    },
    grossAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    netAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "SETTLED", "PROCESSING", "COMPLETED", "CANCELLED", "FAILED"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    settlesAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    tableName: "wallet_transactions",
    timestamps: true,
  }
);

module.exports = WalletTransaction;
