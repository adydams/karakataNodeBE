const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, // auto-generate UUID
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  dateAdded: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  dateModified: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'categories',
  timestamps: false,
});

module.exports = Category;
