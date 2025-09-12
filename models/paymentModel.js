// models/payment.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID, // ✅ Match your Order.id type
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID, // ✅ Match your User.id type
      allowNull: false,
    },
    gateway: {
      type: DataTypes.ENUM("paystack", "flutterwave"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: "NGN",
    },
    reference: {
      // Gateway reference (Paystack ref or Flutterwave tx_ref)
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
      defaultValue: "PENDING",
    },
    rawResponse: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
  }
);

// ✅ Associations (define later in index.js or associate methods)
// Payment.associate = (models) => {
//   Payment.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });
//   Payment.belongsTo(models.User, { foreignKey: "userId", as: "user" });
// };

module.exports = Payment;
