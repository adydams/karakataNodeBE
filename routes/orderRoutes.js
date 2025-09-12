const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management & checkout
 */

/**
 * @swagger
 * /orders/checkout:
 *   post:
 *     summary: Create an order and initialize payment
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - gateway
 *               - email
 *             properties:
 *               shippingAddressId:
 *                 type: uuid
 *                 example: "123 Main St, Lagos"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               notes:
 *                 type: string
 *                 example: "Leave package at the gate"
 *               gateway:
 *                 type: string
 *                 example: "paystack"               
 *     responses:
 *       201:
 *         description: Order created and payment initialized
 *       400:
 *         description: Bad request
 */
router.post("/checkout", (req, res) => orderController.checkout(req, res));

/**
 * @swagger
 * /orders/verify/{orderId}:
 *   post:
 *     summary: Verify payment for an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment verification result
 *       400:
 *         description: Error verifying order
 */
router.post("/verify/:orderId", (req, res) => orderController.verify(req, res));

module.exports = router;
