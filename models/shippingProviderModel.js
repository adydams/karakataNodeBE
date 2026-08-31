const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const ShippingProvider = sequelize.define("ShippingProvider", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  apiKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  baseUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "shipping_providers",
  timestamps: true,
});

module.exports = ShippingProvider;
