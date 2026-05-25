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

    weightKg: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 0
    },

    lengthCm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    widthCm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    heightCm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    logisticsCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pickupStationId: {
        type: DataTypes.UUID,
        allowNull: true
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
