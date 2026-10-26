const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

module.exports = sequelize.define("Hub", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  address: { type: DataTypes.STRING(255), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: true },
  country: { type: DataTypes.STRING(100), allowNull: true },
  lga: { type: DataTypes.STRING(100), allowNull: true },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(254), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "hubs", timestamps: true });
