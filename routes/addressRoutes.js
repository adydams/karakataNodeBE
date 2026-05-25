// routes/addressRoutes.js
const express = require("express");
const router = express.Router();
const addressController = require("../controllers/addressController");
const { auth } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Addresses
 *   description: User shipping address management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "ad3efa24-4629-4124-b4ce-25d4d971b1ba"
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "1d3efa24-4629-4124-b4ce-25d4d971b1aa"
 *         addressLine1:
 *           type: string
 *           example: "123 Main Street"
 *         addressLine2:
 *           type: string
 *           nullable: true
 *           example: "Apartment 4B"
 *         city:
 *           type: string
 *           example: "Lagos"
 *         state:
 *           type: string
 *           example: "Lagos State"
 *         postalCode:
 *           type: string
 *           example: "100001"
 *         country:
 *           type: string
 *           example: "Nigeria"
 *         shipbubbleAddressCode:
 *           type: integer
 *           nullable: true
 *           example: 12345678
 *         isDefault:
 *           type: boolean
 *           example: false
 *         isDeleted:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateAddressRequest:
 *       type: object
 *       required:
 *         - addressLine1
 *         - city
 *         - state
 *         - postalCode
 *         - country
 *       properties:
 *         addressLine1:
 *           type: string
 *           example: "123 Main Street"
 *         addressLine2:
 *           type: string
 *           example: "Apartment 4B"
 *         city:
 *           type: string
 *           example: "Lagos"
 *         state:
 *           type: string
 *           example: "Lagos State"
 *         postalCode:
 *           type: string
 *           example: "100001"
 *         country:
 *           type: string
 *           example: "Nigeria"
 *
 *     UpdateAddressRequest:
 *       type: object
 *       properties:
 *         addressLine1:
 *           type: string
 *           example: "15 Admiralty Way"
 *         addressLine2:
 *           type: string
 *           example: "Suite 10"
 *         city:
 *           type: string
 *           example: "Lekki"
 *         state:
 *           type: string
 *           example: "Lagos"
 *         postalCode:
 *           type: string
 *           example: "101233"
 *         country:
 *           type: string
 *           example: "Nigeria"
 *
 *     AddressResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Address'
 *
 *     AddressesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Address'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Address not found"
 */

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create a new shipping address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAddressRequest'
 *     responses:
 *       201:
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post("/", auth, addressController.create);

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Get all addresses for authenticated user
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressesResponse'
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
 *         description: Address ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", auth, addressController.getOne);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Update shipping address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Address ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAddressRequest'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.put("/:id", auth, addressController.update);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete shipping address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Address ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Address deleted successfully
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
 *                   example: "Address deleted successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.delete("/:id", auth, addressController.delete);

module.exports = router;