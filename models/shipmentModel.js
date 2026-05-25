// models/shipmentModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Shipment = sequelize.define(
  "Shipment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // ShipBubble's own order ID e.g. "SB-2CF48224272"
    shipbubbleOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    courier: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serviceCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    courierId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trackingUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "shipped",
        "in_transit",
        "delivered",
        "failed",
        "cancelled"
      ),
      defaultValue: "pending",
    },
    shippingFee: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    deliveryEta: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Full ShipBubble response for audit/debugging
    rawResponse: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "shipments",
    timestamps: true,
  }
);

// Associations (uncomment in your models/index.js associate block):
// Shipment.associate = (models) => {
//   Shipment.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
// };

module.exports = Shipment;