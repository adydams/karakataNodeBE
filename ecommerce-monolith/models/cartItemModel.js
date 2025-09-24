// models/cartItemModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const CartItem = sequelize.define(
  "CartItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      allowNull: false,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.UUID, // ✅ match Cart.id
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID, // ✅ match Product.id
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "cart_items", // ✅ explicit table name
    timestamps: true,        // ✅ createdAt & updatedAt
  }
);

module.exports = CartItem;
