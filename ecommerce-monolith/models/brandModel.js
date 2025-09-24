const { DataTypes } = require("sequelize");
const sequelize = require("../db/database"); // adjust path

const Brand = sequelize.define(
  "Brand",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    logo: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW, // sets default to current date/time
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW, // also default to now
    },
  },
  {
    tableName: "brands",
    timestamps: true, // Sequelize will still auto-update updatedAt
  }
);

module.exports = Brand;
