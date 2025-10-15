const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticate, authorizeRole } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Delivery tracking and management
 */

/**
 * @swagger
 * /deliveries:
 *   post:
 *     summary: Create a new delivery
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "12345"
 *               courierId:
 *                 type: string
 *                 example: "courier_001"
 *               status:
 *                 type: string
 *                 example: "pending"
 *     responses:
 *       201:
 *         description: Delivery created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authenticate, authorizeRole('admin', 'courier'), deliveryController.createDelivery);

/**
 * @swagger
 * /deliveries/order/{orderId}:
 *   get:
 *     summary: List deliveries by order
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: The order ID
 *     responses:
 *       200:
 *         description: List of deliveries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/order/:orderId', authenticate, authorizeRole('admin', 'courier'), deliveryController.listDeliveries);

/**
 * @swagger
 * /deliveries/{id}:
 *   get:
 *     summary: Get a delivery by ID
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Delivery found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Delivery not found
 */
router.get('/:id', authenticate, authorizeRole('admin', 'courier'), deliveryController.getDelivery);

/**
 * @swagger
 * /deliveries/{id}:
 *   put:
 *     summary: Update a delivery
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "delivered"
 *     responses:
 *       200:
 *         description: Delivery updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Delivery not found
 */
router.put('/:id', authenticate, authorizeRole('admin', 'courier'), deliveryController.updateDelivery);

/**
 * @swagger
 * /deliveries/{id}:
 *   delete:
 *     summary: Delete a delivery
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Delivery deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Delivery not found
 */
router.delete('/:id', authenticate, authorizeRole('admin', 'courier'), deliveryController.deleteDelivery);

module.exports = router;
