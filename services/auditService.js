const { AuditLog } = require("../models");

class AuditService {
  /**
   * Log an administrative action for auditing purposes.
   * @param {Object} params
   * @param {string} params.userId - The ID of the user performing the action.
   * @param {string} params.action - The action performed (e.g., 'UPDATE', 'CREATE', 'PAYOUT_TRIGGER').
   * @param {string} params.entityType - The type of entity affected (e.g., 'Wallet', 'User', 'Payout').
   * @param {string} params.entityId - The ID of the affected entity.
   * @param {any} [params.oldValue] - The state of the entity before the action.
   * @param {any} [params.newValue] - The state of the entity after the action.
   */
  async log({ userId, action, entityType, entityId, oldValue = null, newValue = null }) {
    try {
      await AuditLog.create({
        userId,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
      });
    } catch (err) {
      // We log audit errors to console but don't crash the main process
      // to ensure that auditing failures don't block critical business operations.
      console.error("❌ Audit Logging Error:", err);
    }
  }
}

module.exports = new AuditService();
