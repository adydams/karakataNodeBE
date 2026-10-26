const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Discount = sequelize.define("Discount", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false,
    comment: "Customer-facing promotion title used in adverts and checkout messaging",
  },
  type: {
    type: DataTypes.ENUM("PERCENTAGE", "FLAT"),
    allowNull: false,
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Percent (0–100) for PERCENTAGE, or flat amount for FLAT",
  },
  minOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "null = unlimited",
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isAutomatic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if the discount is applied automatically to eligible orders",
  },
  displayInAdverts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  advertStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  advertEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: "discounts",

  timestamps: true,
});

module.exports = Discount;