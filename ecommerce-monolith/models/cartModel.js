// models/cartModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Cart = sequelize.define(
  "Cart",
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
  },
  {
    tableName: "carts", // ✅ explicit table name
    timestamps: true,   // ✅ createdAt & updatedAt
  }
);

module.exports = Cart;
