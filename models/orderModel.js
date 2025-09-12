// models/orderModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Order = sequelize.define(
  "Order",
  {
    id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("PENDING", "PAID", "FAILED", "SHIPPED", "DELIVERED"),
    defaultValue: "PENDING",
  },
  },
  {
    tableName: "orders", // ✅ explicit table name
    timestamps: true,    // ✅ Sequelize auto-manages createdAt & updatedAt
  }
);

module.exports = Order;
