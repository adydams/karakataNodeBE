const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Inventory = sequelize.define("Inventory", {
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
  storeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "stores", key: "id" },
  },
  quantityOnHand: {
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
}, {
  tableName: "inventories",
  timestamps: true,
});

module.exports = Inventory;