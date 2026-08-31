const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { authenticate, authorizeRole, ensureActive } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: System Audit
 *   description: API for accessing system audit trails
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get all audit logs
 *     description: Retrieve a paginated list of system audit logs with optional filters.
 *     tags: [System Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action (e.g., UPDATE, CREATE)
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *         description: Filter by entity type (e.g., Wallet, User)
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Filter by user ID
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in action or entity
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticate,
  ensureActive,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  auditController.getAuditLogs
);

router.get(
  "/:id",
  authenticate,
  ensureActive,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  auditController.getLogDetails
);

module.exports = router;
