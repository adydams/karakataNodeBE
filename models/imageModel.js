const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      allowNull: false,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    public_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "product_images", // ✅ consistent naming
    timestamps: true, // ✅ createdAt & updatedAt auto-managed
  }
);

module.exports = ProductImage;
