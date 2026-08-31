const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const ProductDiscount = sequelize.define("ProductDiscount", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  discountType: {
    type: DataTypes.ENUM("PERCENTAGE", "FIXED"),
    allowNull: false,
    defaultValue: "PERCENTAGE",
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  maxQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "ProductDiscounts",
  timestamps: true,
});

module.exports = ProductDiscount;
