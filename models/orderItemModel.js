// OrderItem.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

  const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.UUID, allowNull:false, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false }, // matches Orders.id
  productId: { type: DataTypes.UUID, allowNull: false },   // <-- UUID now
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
  tableName: 'orderitems',
  timestamps: true,
});

module.exports = OrderItem;