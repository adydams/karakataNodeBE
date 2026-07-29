// models/Store.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database"); // adjust path if needed

const Store = sequelize.define(
  "Store",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },

    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    returnWindowDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payoutAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payoutBankCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payoutAccountName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "stores",
    timestamps: true, // Sequelize manages createdAt + updatedAt
  }

);

module.exports = Store;
