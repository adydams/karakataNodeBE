// models/orderModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      allowNull: false,
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
    status: {
      type: DataTypes.ENUM("pending", "paid", "shipped", "completed", "cancelled"),
      defaultValue: "pending",
    },
    paymentGateway: {
      type: DataTypes.ENUM("paystack", "flutterwave"),
      allowNull: false,
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "orders", // ✅ explicit table name
    timestamps: true,    // ✅ Sequelize auto-manages createdAt & updatedAt
  }
);

module.exports = Order;
