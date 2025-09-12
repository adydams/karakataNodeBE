const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const ShippingAddress = sequelize.define(
  'ShippingAddress',
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
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    addressLine1: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    addressLine2: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'shipping_addresses',
    timestamps: true,
  }
);

// Associations
ShippingAddress.associate = (models) => {
  ShippingAddress.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  ShippingAddress.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
};

module.exports = ShippingAddress;