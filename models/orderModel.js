// // models/orderModel.js
// const { DataTypes } = require("sequelize");
// const sequelize = require("../db/database");

// const Order = sequelize.define(
//   "Order",
//   {
//     id: {
//     type: DataTypes.UUID,
//     defaultValue: DataTypes.UUIDV4,
//     primaryKey: true,
//   },
//   userId: {
//     type: DataTypes.UUID,
//     allowNull: false,
//   },
//   totalAmount: {
//     type: DataTypes.FLOAT,
//     allowNull: false,
//   },
//   phone: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
  
//   notes: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
//   shippingMethod: {
//     type: DataTypes.ENUM("SHIPPING", "PICKUP"),
//     defaultValue: "SHIPPING",
//   },
//   logisticsRequestToken: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   logisticsServiceCode: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   logisticsCourierId: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   shippingFee: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0,
//   },
//   status: {
//     type: DataTypes.ENUM("PENDING", "PAID", "FAILED"),
//     defaultValue: "PENDING",
//   },
//   logisticsStatus: {
//     type: DataTypes.ENUM("PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "DELIVERY_FAILED"),
//     defaultValue: "PROCESSING",
//   },
  
//   isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
//   },
//   {
//     tableName: "orders", // ✅ explicit table name
//     timestamps: true,    // ✅ Sequelize auto-manages createdAt & updatedAt
//   }
// );

// module.exports = Order;

// models/orderModel.js

// models/orderModel.js

const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    shippingAddressId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    // ✅ replaces the 8 individual shipping columns
    shippingSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    shippingFee: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    paymentGateway: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    shippingMethod: {
      type: DataTypes.ENUM("SHIPPING", "PICKUP"),
      defaultValue: "SHIPPING",
    },

    logisticsRequestToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    logisticsServiceCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    logisticsCourierId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("PENDING", "PAID", "FAILED", "CANCELLED"),
      defaultValue: "PENDING",
    },

    logisticsStatus: {
      type: DataTypes.ENUM(
        "PROCESSING",
        "SHIPPED",
        "IN_TRANSIT",
        "DELIVERED",
        "DELIVERY_FAILED"
      ),
      defaultValue: "PROCESSING",
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "orders",
    timestamps: true,
  }
);

module.exports = Order;