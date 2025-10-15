const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    subCategoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    brandId: {
      type: DataTypes.UUID,
      allowNull: true,
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    qrCode: {
      type: DataTypes.TEXT("long"), // Cloudinary URL or Base64
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "products",
    timestamps: true, // ✅ Sequelize will auto-manage createdAt & updatedAt
  }
);

module.exports = Product;
