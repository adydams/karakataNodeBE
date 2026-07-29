const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const ProductPickupStation = sequelize.define(
  "ProductPickupStation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    pickupStationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "store_pickup_stations",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "product_pickup_stations",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["productId", "pickupStationId"],
      },
    ],
  }
);

module.exports = ProductPickupStation;