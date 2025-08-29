// models/user.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');


  const User = sequelize.define("User", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING(40) },
   // passwordHash will be null for OAuth-only users
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("user", "admin"), defaultValue: "user" },
     // provider + providerId for OAuth
  provider: { type: DataTypes.STRING(50), allowNull: true },
  providerId: { type: DataTypes.STRING(255), allowNull: true }
  }, { tableName: "users", timestamps: true });

  User.associate = (models) => {
    User.hasMany(models.Address, { foreignKey: "userId", as: "addresses", onDelete: "CASCADE" });
    User.hasMany(models.Review, { foreignKey: "userId", as: "reviews", onDelete: "CASCADE" });
    User.hasMany(models.Favorite, { foreignKey: "userId", as: "favorites", onDelete: "CASCADE" });
  };

  module.exports = User;
