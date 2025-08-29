const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

// models/image.js



  const ProductImage = sequelize.define("ProductImage", {
   url: { type: DataTypes.STRING, allowNull: false }
  });

  // imageModel.associate = (models) => {
  //   imageModel.belongsTo(models.Product, {
  //     foreignKey: "productId",
  //     as: "product"
  //   });
 

  module.exports = ProductImage;

