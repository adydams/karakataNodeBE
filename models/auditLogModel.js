const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // null if action was performed by system
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., 'Permission', 'RolePermission'
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    oldValue: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "audit_logs",
    timestamps: true, // Only createdAt is primarily needed, but we keep both
  }
);

module.exports = AuditLog;
