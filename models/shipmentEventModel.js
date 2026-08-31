const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const ShipmentEvent = sequelize.define(
  "ShipmentEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    shipmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "shipments",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      // e.g., 'ORDER_RECEIVED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      // e.g., 'Station Alpha', 'Central Hub', 'Driver's Van'
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "shipment_events",
    timestamps: true,
  }
);

module.exports = ShipmentEvent;
