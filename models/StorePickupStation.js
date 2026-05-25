const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");



const StorePickupStation = sequelize.define(
  "StorePickupStation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    shipbubbleAddressCode: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
  },
  {
    tableName: "store_pickup_stations",
    timestamps: true,
  }
);
module.exports = StorePickupStation;