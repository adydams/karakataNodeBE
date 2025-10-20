const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Each permission should be unique
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Soft delete flag
    },
  },
  {
    tableName: "permissions", // Explicit table name
    timestamps: true,         // Adds createdAt & updatedAt automatically
  }
);

// 🔗 Associations
// Permission.associate = (models) => {
//   Permission.belongsToMany(models.Role, {
//     through: "RolePermissions",
//     as: "roles",
//     foreignKey: "permissionId",
//   });
// };

module.exports = Permission;
