const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

module.exports = sequelize.define("RefundLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderItemId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  paystackRefundId: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM("initiated", "processing", "completed", "failed"), allowNull: false, defaultValue: "initiated" },
  reason: { type: DataTypes.STRING, allowNull: false },
  failureReason: { type: DataTypes.TEXT, allowNull: true },
  retryCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lastAttemptAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "refund_logs", timestamps: true });
