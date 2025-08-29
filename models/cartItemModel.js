// CartItem.js

const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

  const CartItem = sequelize.define("CartItem", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cartId: { type: DataTypes.INTEGER, allowNull: false },
      productId: { type: DataTypes.UUID, allowNull: false }, // match Product.id
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  });

  
  module.exports =  CartItem;

