const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, // auto-generate UUID
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  categoryId: {
    type: DataTypes.UUID, // matches Category.id type
    allowNull: false,
    // Don't define references here - do it in associations
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: true, // make it optional
  }, 
  qrCode: {
    type: DataTypes.STRING,
    allowNull: true,
  }, // store QR code image path or base64 string
  dateAdded: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  dateModified: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'products',
  timestamps: false,
});

module.exports = Product;