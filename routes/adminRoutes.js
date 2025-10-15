// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth } = require("../middlewares/auth");
const { authorizeRole }  = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: Endpoints for managing Admin users
 */

/**
 * @swagger
 * /api/admin/onboard-admin:
 *   post:
 *     summary: Onboard a new Admin user
 *     description: Allows only a SuperAdmin to onboard a new Admin user. A static password is used temporarily until SMTP is configured.
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane.doe@example.com
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       201:
 *         description: Admin user onboarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin user onboarded successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "b1c23d45-e6f7-89ab-cdef-0123456789ab"
 *                     name:
 *                       type: string
 *                       example: Jane Doe
 *                     email:
 *                       type: string
 *                       example: jane.doe@example.com
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Bad request or validation error
 *       403:
 *         description: Forbidden — only SuperAdmin can onboard Admin users
 *       401:
 *         description: Unauthorized — missing or invalid token
 */
router.post("/onboard-admin",
             auth,
             //authorizeRole("SuperAdmin", "SystemAdmin"), // Multi-role access
             authorizeRole("SuperAdmin"),
             //checkPermissions("admin:create"),  
             adminController.onboardAdmin);

module.exports = router;
