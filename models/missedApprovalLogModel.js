const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

module.exports = sequelize.define("MissedApprovalLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderItemId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  storeId: { type: DataTypes.UUID, allowNull: false },
  occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "missed_approval_logs", timestamps: true });
