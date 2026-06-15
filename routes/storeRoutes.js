const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");
const {authenticate, authorizeRole} = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Stores
 *   description: Store management
 */


/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create a new store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeOwnerId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional. Only SuperAdmin can create a store for another user.
 *               name:
 *                 type: string
 *                 example: My Store
 *               address:
 *                 type: string
 *                 example: 123 Main Street
 *               phone:
 *                 type: string
 *                 example: +2348012345678
 *               email:
 *                 type: string
 *                 example: store@email.com
 *               description:
 *                 type: string
 *                 example: Best electronics shop
 *     responses:
 *       201:
 *         description: Store created successfully
 */
router.post("/",  authenticate, authorizeRole("Admin", "SuperAdmin"), storeController.create);

/**
 * @swagger
 * /api/stores:
 *   get:
 *     summary: Get all stores
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: List of stores
 */
router.get("/", authorizeRole("Admin", "SuperAdmin"), storeController.getAll);

/**
 * @swagger
 * /api/stores/{id}:
 *   get:
 *     summary: Get a store by ID
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store details
 *       404:
 *         description: Store not found
 */
router.get("/:id", authorizeRole("Admin", "SuperAdmin"), storeController.getById);

/**
 * @swagger
 * /stores/{id}:
 *   put:
 *     summary: Update a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store updated successfully
 *       404:
 *         description: Store not found
 */
router.put("/:id",authorizeRole("Admin", "SuperAdmin"), storeController.update);

/**
 * @swagger
 * /api/stores/{id}:
 *   delete:
 *     summary: Delete a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store deleted successfully
 *       404:
 *         description: Store not found
 */
router.delete("/:id",authorizeRole("SuperAdmin"), storeController.delete);

module.exports = router;
