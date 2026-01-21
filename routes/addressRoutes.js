// routes/addressRoutes.js
const express = require("express");
const router = express.Router();
const addressController = require("../controllers/addressController");
const { auth } = require("../middlewares/auth");

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create a new address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - line1
 *               - city
 *               - state
 *               - country
 *             properties:
 *               line1:
 *                 type: string
 *                 example: "123 Main Street"
 *               line2:
 *                 type: string
 *                 example: "Apartment 4B"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               state:
 *                 type: string
 *                 example: "Lagos State"
 *               country:
 *                 type: string
 *                 example: "Nigeria"
 *               postalCode:
 *                 type: string
 *                 example: "100001"
 *     responses:
 *       201:
 *         description: Address created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", auth, addressController.create);

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     tags:
 *       - Addresses
 *     summary: Get all addresses
 *     description: Retrieve all addresses for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 addresses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "uuid"
 *                       line1:
 *                         type: string
 *                         example: "123 Main Street"
 *                       city:
 *                         type: string
 *                         example: "Lagos"
 *                       state:
 *                         type: string
 *                         example: "Lagos State"
 *                       country:
 *                         type: string
 *                         example: "Nigeria"
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, addressController.getAll);



/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Get address by ID
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 address:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     line1:
 *                       type: string
 *                     line2:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     country:
 *                       type: string
 *                     postalCode:
 *                       type: string
 *                     isDeleted:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.get("/:id", auth, addressController.getOne);


/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Update an address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               line1:
 *                 type: string
 *               line2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Address updated
 */
router.put("/:id", auth, addressController.update);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted
 *       404:
 *         description: Address not found
 */
router.delete("/:id", auth, addressController.delete);

module.exports = router;
