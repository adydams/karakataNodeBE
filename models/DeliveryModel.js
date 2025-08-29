// models/shippingAddress.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const ShippingAddress = sequelize.define('ShippingAddress', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  addressLine1: { type: DataTypes.STRING, allowNull: false },
  addressLine2: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  postalCode: { type: DataTypes.STRING, allowNull: false },
  country: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'shipping_addresses', timestamps: true });

module.exports = ShippingAddress;

// models/delivery.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const Delivery = sequelize.define('Delivery', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  courier: { type: DataTypes.STRING, allowNull: false },
  trackingNumber: { type: DataTypes.STRING, allowNull: true },
  status: { 
    type: DataTypes.ENUM('pending', 'shipped', 'in_transit', 'delivered', 'failed'), 
    defaultValue: 'pending' 
  },
  expectedDelivery: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'deliveries', timestamps: true });

module.exports = Delivery;
