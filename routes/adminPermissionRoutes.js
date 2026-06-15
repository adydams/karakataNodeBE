const express = require("express");
const router = express.Router();
const adminPermissionController = require("../controllers/adminPermissionController");
const {authenticate, authorizeRole} = require("../middlewares/auth");
//const { authorizeRole } = require("../middleware/auth");
/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: Manage permissions for admin roles
 */

/**
 * @swagger
 * /api/permission:
 *   get:
 *     summary: Get all permissions
 *     description: Retrieve a list of all permissions (non-deleted), with optional filtering and pagination.
 *     tags: [Admin Management]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter permissions by name (partial match)
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
 *         description: Successfully retrieved list of permissions
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
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 */
router.get(
  "/",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminPermissionController.getAllPermissions
);

/**
 * @swagger
 * /api/permission:
 *   post:
 *     summary: Create a new permission
 *     description: Allows a SuperAdmin to create a new permission.
 *     tags: [Admin Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: getallusers_view
 *               description:
 *                 type: string
 *                 example: Allows viewing all users
 *     responses:
 *       201:
 *         description: Permission created successfully
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
 *                   example: Permission created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 */
router.post(
  "/",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminPermissionController.createPermission
);

/**
 * @swagger
 * /api/permission/{id}:
 *   put:
 *     summary: Update an existing permission
 *     description: Modify a permission’s name or description.
 *     tags: [Admin Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the permission to update
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
 *                 example: updateuser_view
 *               description:
 *                 type: string
 *                 example: Allows updating user information
 *     responses:
 *       200:
 *         description: Permission updated successfully
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
 *                   example: Permission updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 */
router.put(
  "/:id",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminPermissionController.updatePermission
);

/**
 * @swagger
 * /api/permission/{id}:
 *   delete:
 *     summary: Soft delete a permission
 *     description: Marks a permission as deleted instead of permanently removing it.
 *     tags: [Admin Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the permission to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission deleted successfully
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
 *                   example: Permission deleted successfully
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRole("SuperAdmin"),
  adminPermissionController.deletePermission
);


/**
 * @swagger
 * /api/permission/assign-permissions-to-role:
 *   post:
 *     summary: Assign permissions to a role
 *     description: |
 *       Assigns one or more permissions to a specific role.
 *       Only users with Admin role can perform this action.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *               - permissionIds
 *             properties:
 *               roleId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the role to assign permissions to
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *                 description: Array of permission IDs
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
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
 *                   example: Permissions assigned successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request (invalid input or assignment error)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Role not found
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No token provided
 *       403:
 *         description: Forbidden (insufficient role)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Forbidden: insufficient rights
 */
  router.post( "/assign-permissions-to-role", authenticate,  authorizeRole("Admin"),   adminPermissionController.assignPermissions  );

module.exports = router;
