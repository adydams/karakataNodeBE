const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const SystemSetting = sequelize.define(
  "SystemSetting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    businessModel: {
      type: DataTypes.ENUM("MARKETPLACE", "SAAS", "WHITE_LABEL"),
      defaultValue: "MARKETPLACE",
      allowNull: false,
    },
    defaultCommissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 8.00,
      allowNull: false,
    },
    shippingMarkupPercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 2.00,
      allowNull: false,
    },
    returnWindowDays: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      allowNull: false,
    },
    payoutDelayDays: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
      allowNull: false,
    },
    minimumPayoutAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1000.00,
      allowNull: false,
    },
    vatPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 7.50,
      allowNull: false,
    },
    internalBaseFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1000.00,
      allowNull: false,
    },
    internalPricePerKm: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 100.00,
      allowNull: false,
    },
    internalPricePerKg: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 50.00,
      allowNull: false,
    },
    pickupFeePercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 60.00,
      allowNull: false,
      comment: "Percentage of the internal fleet delivery price charged for pickup orders",
    },
    productApprovalRequired: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    productApprovalSlaEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    productApprovalSlaHours: { type: DataTypes.INTEGER, defaultValue: 48, allowNull: false },
    orderItemApprovalWindowHours: { type: DataTypes.INTEGER, defaultValue: 24, allowNull: false },
    missedApprovalEscalationThreshold: { type: DataTypes.INTEGER, defaultValue: 3, allowNull: false },
    missedApprovalWindowDays: { type: DataTypes.INTEGER, defaultValue: 30, allowNull: false },
    autoUnlistAfterMissedApprovals: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  },
  {
    tableName: "system_settings",
    timestamps: true,
  }

);

module.exports = SystemSetting;
