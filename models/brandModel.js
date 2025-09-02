const { DataTypes } = require("sequelize");
const sequelize = require("../db/database"); // adjust path to your sequelize instance

const Brand = sequelize.define("Brand", {
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
});

module.exports = Brand;
