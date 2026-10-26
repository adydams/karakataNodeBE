const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const OrderItemFulfillment = sequelize.define(
  "OrderItemFulfillment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orderitems",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    pickupStationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "store_pickup_stations",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    statusNote: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    statusUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "order_item_fulfillments",
    timestamps: true,
  }
);

module.exports = OrderItemFulfillment;
