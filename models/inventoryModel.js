const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Inventory = sequelize.define(
  "Inventory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "products", key: "id" },
      onDelete: "CASCADE",
    },
    pickupStationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "store_pickup_stations", key: "id" },
      onDelete: "CASCADE",
    },
    quantityOnHand: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quantityReserved: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "inventories",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["productId", "pickupStationId"],
        name: "inventory_product_station_unique",
      },
      { fields: ["pickupStationId"] },
    ],
  }
);

module.exports = Inventory;
