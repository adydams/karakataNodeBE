const AuditLog = require("../models/auditLogModel");

exports.logAction = async ({ userId, action, entityType, entityId, oldValue, newValue }) => {
  if (!action || !entityType || !entityId) {
    throw new Error("Action, entityType, and entityId are required for audit logging");
  }

  return await AuditLog.create({
    userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
  });
};
