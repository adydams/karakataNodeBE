const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const Role = sequelize.define(
  "Role",
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
      unique: true, // Role names should be unique (e.g., "SuperAdmin", "Admin")
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "roles", // Explicit table name
    timestamps: true,   // Adds createdAt & updatedAt
  }
);

// 🔗 Associations
Role.associate = (models) => {
  // A role can have many permissions
  Role.belongsToMany(models.Permission, {
    through: "RolePermissions",
    as: "permissions",
    foreignKey: "roleId",
  });

  // A role can belong to many users
  Role.belongsToMany(models.User, {
    through: "UserRoles",
    as: "users",
    foreignKey: "roleId",
  });
};

module.exports = Role;
