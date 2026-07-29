const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Wallet = sequelize.define(
  "Wallet",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "stores", key: "id" },
    },
    availableBalance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    pendingBalance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    lifetimeEarnings: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    tableName: "wallets",
    timestamps: true,
  }
);

module.exports = Wallet;
