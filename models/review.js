

// models/Review.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const Review = sequelize.define(
  'Review',
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
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'reviews',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'productId'],
      },
    ],
  }
);

// Associations
Review.associate = (models) => {
  Review.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Review.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
};

module.exports = Review;
