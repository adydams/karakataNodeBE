// models/payment.js
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    gateway: {
      type: DataTypes.ENUM('paystack', 'flutterwave'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'NGN'
    },
    reference: { // gateway reference (Paystack ref or Flutterwave tx_ref)
      type: DataTypes.STRING,
      allowNull: true
    },
    status: { // pending | success | failed
      type: DataTypes.ENUM('pending','success','failed'),
      defaultValue: 'pending'
    },
    rawResponse: { type: DataTypes.JSON, allowNull: true }
  }, {
    tableName: 'payments',
    timestamps: true
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    Payment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Payment;
};
