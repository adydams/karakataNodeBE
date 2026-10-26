// OrderItem.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

  const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.UUID, 
    allowNull:false,
    defaultValue: DataTypes.UUIDV4,
     primaryKey: true },
  orderId: { 
    type: DataTypes.UUID, 
    
    allowNull: false 
  }, // matches Orders.id
  productId: { type: DataTypes.UUID, allowNull: false },   // <-- UUID now
  pickupStationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "store_pickup_stations", key: "id" }
  },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  productName: { type: DataTypes.STRING, allowNull: true },
  productDiscountId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "ProductDiscounts", key: "id" }
  },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  approvalStatus: {
    type: DataTypes.ENUM("pending", "approved", "expired", "declined"),
    allowNull: false,
    defaultValue: "pending",
  },
  approvalDeadline: { type: DataTypes.DATE, allowNull: true },
  approvalRespondedAt: { type: DataTypes.DATE, allowNull: true },
  approvalReason: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'PENDING',
    allowNull: true
  },
}, {
  tableName: 'orderitems',
  timestamps: true,
});

module.exports = OrderItem;