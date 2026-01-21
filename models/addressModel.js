// models/addressModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Address = sequelize.define(
  "Address",
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
    line1: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    line2: {
      type: DataTypes.STRING(200),
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING(40),
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // ✅ soft delete
    },
  },
  {
    tableName: "addresses",
    timestamps: true,
  }
);

module.exports = Address;
