// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminDriverController = require("../controllers/adminDriverController");
const adminFinanceController = require("../controllers/adminFinanceController");
const adminOverviewController = require("../controllers/adminOverviewController");
const { authenticate, authorizeRole } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: Endpoints for managing Admin users
 */

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Allows an admin to log in using email and password.
 *     tags: [Admin Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", adminController.Adminlogin);


/**
 * @swagger
 * /api/admin/onboard-admin:
 *   post:
 *     summary: Onboard a new Admin user
 *     description: Allows only a SuperAdmin to onboard a new Admin user.
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
 *               - password
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
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "@mysecurepassword"
 */
router.post("/onboard-admin",
             authenticate,
             //authorizeRole("SuperAdmin", "SystemAdmin"), // Multi-role access
            // authorizeRole("SuperAdmin"),
             //checkPermissions("admin:create"),  
             adminController.onboardAdmin);
             
/**
 * @swagger
 * /api/admin/filter/users:
 *   get:
 *     summary: Get a paginated list of Admins (with filters)
 *     description: Retrieve admins filtered by role, name, phone, or email.
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roleName
 *         schema:
 *           type: string
 *         description: Filter by role name
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by admin name
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Filter by phone number
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of Admins fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalRecords:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 admins:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Admin'
 *       500:
 *         description: Server error
 */
router.get( "/filter/users",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminController.filterAdmins
);
        

/**
 * @swagger
 * /api/admin/list:
 *   get:
 *     summary: Get all admins with filters and pagination
 *     description: Retrieve a list of admins filtered by role, name, phone, or email, with pagination support.
 *     tags: [Admin Management]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by admin name
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Filter by phone number
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email address
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Successfully retrieved list of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalRecords:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       role:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           role:
 *                             type: string
 *                           description:
 *                             type: string
 */
router.get(
  "/list",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminController.getAllAdmins
);


/**
 * @swagger
 * /api/admin/{id}:
 *   get:
 *     summary: Get Admin details by ID
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin details retrieved successfully
 */
router.get(
  "/:id",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminController.getAdminById
);

/**
 * @swagger
 * /api/admin/{id}:
 *   put:
 *     summary: Update Admin info
 *     description: Allows SuperAdmin to update Admin details.
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe Updated
 *               phone:
 *                 type: string
 *                 example: "+2348023456789"
 *               email:
 *                 type: string
 *                 example: jane.updated@example.com
 *     responses:
 *       200:
 *         description: Admin updated successfully
 */
router.put(
  "/:id",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminController.updateAdmin
);

/**
 * @swagger
 * /api/admin/{id}/role:
 *   patch:
 *     summary: Promote or demote Admin role
 *     description: Only SuperAdmin can update role.
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 example: SystemAdmin
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.patch(
  "/:id/role",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminController.updateAdminRole
);

/**
 * @swagger
 * /api/admin/{id}/status:
 *   patch:
 *     summary: Activate or deactivate an Admin account
 *     description: Only SuperAdmin can perform this action.
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Admin account status updated successfully
 */
router.patch(
  "/:id/status",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminController.updateAdminStatus
);

/**
 * @swagger
 * /api/admin/{id}:
 *   delete:
 *     summary: Remove or disable an Admin permanently
 *     description: Only SuperAdmin can delete Admin accounts.
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin deleted successfully
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminController.deleteAdmin
);

/**
 * Driver Reports
 */
router.get(
  "/finance/settlement-eligible",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminFinanceController.getSettlementEligible
);

router.post(
  "/finance/confirm-settlement",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminFinanceController.confirmSettlement
);

router.get(
  "/drivers/summary",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminDriverController.getDriversSummary
);

router.get(
  "/drivers/active-deliveries",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminDriverController.getActiveDeliveries
);

router.get(
  "/drivers/report/:driverId",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminDriverController.getDriverReport
);

/**
 * Admin Finance Management
 */
router.get(
  "/finance/overview",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getOverview
);

router.get(
  "/finance/revenue-chart",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getRevenueChart
);

router.get(
  "/finance/wallets",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getWallets
);

router.get(
  "/finance/wallet/:walletId",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getWalletDetails
);

router.get(
  "/finance/transactions",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getGlobalTransactions
);

router.get(
  "/finance/payouts",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getPayouts
);

router.post(
  "/finance/payouts/trigger",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.triggerPayout
);

router.post(
  "/finance/wallets/adjust",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.adjustBalance
);

router.post(
  "/finance/payouts/global",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.triggerGlobalPayout
);

router.get(
  "/finance/export-report",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.exportFinancialReport
);

/**
 * Finance Reports
 */
router.get(
  "/finance/summary",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getSummary
);

router.get(
  "/overview/top-products",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminOverviewController.getTopProducts
);

router.get(
  "/overview/customer-stats",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin", "Admin"),
  adminOverviewController.getCustomerStats
);

router.get(
  "/finance/chart",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getRevenueChart
);

router.get(
  "/finance/transactions",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getTransactions
);

router.get(
  "/finance/payouts",
  authenticate,
  authorizeRole("SuperAdmin", "SystemAdmin"),
  adminFinanceController.getPayoutRequests
);

module.exports = router;
