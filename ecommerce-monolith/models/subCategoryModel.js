const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');
const Category = require('./categoryModel');

const SubCategory = sequelize.define('SubCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  categoryId: {
    type: DataTypes.UUID,   // ✅ MATCHES Category.id
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'subcategories',
  timestamps: true,
});

// Associations
Category.hasMany(SubCategory, {
  as: 'subCategories',
  foreignKey: 'categoryId',
});
SubCategory.belongsTo(Category, {
  as: 'category',
  foreignKey: 'categoryId',
});

module.exports = SubCategory;
