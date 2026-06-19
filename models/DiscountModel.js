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
}, {
  tableName: "discounts",
  timestamps: true,
});

module.exports = Discount;