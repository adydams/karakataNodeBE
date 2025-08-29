// Cart.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');


  const Cart = sequelize.define("Cart", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
  });

  
module.exports =Cart
