const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // auto-generate UUID
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "permissions", // ✅ explicit table name
    timestamps: true,         // ✅ adds createdAt & updatedAt automatically
  }
);

// Associations
Permission.associate = (models) => {
  Permission.belongsToMany(models.Role, {
    through: "RolePermissions",
    as: "roles",
    foreignKey: "permissionId",
  });
};

module.exports = Permission;
