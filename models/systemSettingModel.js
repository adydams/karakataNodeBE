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
  },
  {
    tableName: "system_settings",
    timestamps: true,
  }
);

module.exports = SystemSetting;
