const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

// models/favorite.js


  const Favorite = sequelize.define("Favorite", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false }
  }, { tableName: "favorites", 
    timestamps: true,
     //indexes: [{ unique: true, fields: ["userId", "productId"] }] 
  });
module.exports = Favorite;
  // Favorite.associate = (models) => { 
  //   Favorite.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  //   Favorite.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  // };

  //return Favorite;


