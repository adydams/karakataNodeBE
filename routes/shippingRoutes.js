const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Shipping
 *   description: Shipping address and delivery management
 */

/**
 * @swagger
 * /api/shipping:
 *   post:
 *     summary: Create a shipping address
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               orderId:
 *                 type: integer
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipping address created
 */
router.post('/',
    authenticate,
    authorize('customer', 'admin'),
   shippingController.createAddress);

/**
 * @swagger
 * /api/shipping/user/{userId}:
 *   get:
 *     summary: List shipping addresses for a user
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of shipping addresses
 */
router.get('/user/:userId', shippingController.listAddresses);

/**
 * @swagger
 * /api/shipping/{id}:
 *   get:
 *     summary: Get shipping address by ID
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping address details
 */
router.get('/:id', shippingController.getAddress);

router.put('/:id', shippingController.updateAddress);
router.delete('/:id', shippingController.deleteAddress);

/**
 * @swagger
 * /api/shipping/delivery:
 *   post:
 *     summary: Create a delivery
 *     tags: [Shipping]
 */
// router.post('/delivery', shippingController.createDelivery);

// router.get('/delivery/order/:orderId', shippingController.listDeliveries);
// router.get('/delivery/:id', shippingController.getDelivery);
// router.put('/delivery/:id', shippingController.updateDelivery);
// router.delete('/delivery/:id', shippingController.deleteDelivery);
/**
 * @swagger
 * /api/shipping/{id}:
 *   put:
 *     summary: Update a shipping address
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipping address updated
 */
router.put('/:id', shippingController.updateAddress);

/**
 * @swagger
 * /api/shipping/{id}:
 *   delete:
 *     summary: Delete a shipping address
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping address deleted
 */
router.delete('/:id', shippingController.deleteAddress);

/**
 * @swagger
 * /api/shipping/delivery/order/{orderId}:
 *   get:
 *     summary: List deliveries for an order
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of deliveries
 */
router.get('/delivery/order/:orderId', shippingController.listDeliveries);

/**
 * @swagger
 * /api/shipping/delivery/{id}:
 *   get:
 *     summary: Get delivery by ID
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery details
 */
router.get('/delivery/:id', shippingController.getDelivery);

/**
 * @swagger
 * /api/shipping/delivery/{id}:
 *   put:
 *     summary: Update a delivery
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               courier:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, shipped, in_transit, delivered, failed]
 *               expectedDelivery:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Delivery updated
 */
router.put('/delivery/:id', shippingController.updateDelivery);

/**
 * @swagger
 * /api/shipping/delivery/{id}:
 *   delete:
 *     summary: Delete a delivery
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery deleted
 */
router.delete('/delivery/:id', shippingController.deleteDelivery);

module.exports = router;
