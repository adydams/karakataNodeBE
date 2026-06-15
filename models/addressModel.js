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
      allowNull: true,
    },

    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ShipBubble validated code
    shipbubbleAddressCode: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "addresses",
    timestamps: true,
  }
);

module.exports = Address;
