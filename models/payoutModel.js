const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Payout = sequelize.define(
  "Payout",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "stores", key: "id" },
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "wallets", key: "id" },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bankCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accountName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paystackTransferCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paystackTransferRef: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PROCESSING", "PAID", "FAILED"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "payouts",
    timestamps: true,
  }
);

module.exports = Payout;
