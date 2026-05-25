const express = require("express");
const router = express.Router();
const logisticsController = require("../controllers/logisticsController");
const {auth, authorizeRole} = require("../middlewares/auth");

/* ─────────────────────────────────────────────────────────────
   WEBHOOK - SHIPBUBBLE
───────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/logistics/webhook:
 *   post:
 *     summary: ShipBubble webhook handler
 *     tags: [Logistics]
 *     description: Receives shipment status updates from ShipBubble. No authentication required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id, status]
 *             properties:
 *               order_id:
 *                 type: string
 *                 example: "SB-123456"
 *               status:
 *                 type: string
 *                 enum: [shipped, in_transit, delivered, failed]
 *     responses:
 *       200:
 *         description: Webhook received successfully
 */
router.post("/webhook", logisticsController.webhook);

/* ─────────────────────────────────────────────────────────────
   GET SHIPPING RATES
───────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/logistics/rates:
 *   post:
 *     summary: Get shipping rates for an order
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddressId
 *               - packageItems
 *               - packageDimension
 *               - categoryId
 *             properties:
 *               shippingAddressId:
 *                 type: string
 *                 example: "addr_123"
 *               packageItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, unit_weight, unit_amount, quantity]
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     unit_weight:
 *                       type: number
 *                     unit_amount:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *               packageDimension:
 *                 type: object
 *                 required: [length, width, height]
 *                 properties:
 *                   length:
 *                     type: number
 *                   width:
 *                     type: number
 *                   height:
 *                     type: number
 *               categoryId:
 *                 type: string
 *               pickupDate:
 *                 type: string
 *                 example: "2026-05-12"
 *               serviceType:
 *                 type: string
 *                 enum: [pickup, dropoff]
 *     responses:
 *       200:
 *         description: Shipping rates retrieved
 */
router.post("/rates", auth, logisticsController.getRates);

/* ─────────────────────────────────────────────────────────────
   BOOK SHIPMENT
───────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/logistics/book:
 *   post:
 *     summary: Book a shipment using selected courier
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, requestToken, serviceCode, courierId]
 *             properties:
 *               orderId:
 *                 type: string
 *               requestToken:
 *                 type: string
 *               serviceCode:
 *                 type: string
 *               courierId:
 *                 type: string
 *               courierName:
 *                 type: string
 *               shippingFee:
 *                 type: number
 *               deliveryEta:
 *                 type: string
 *               insuranceCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shipment booked successfully
 */
router.post("/book", auth, logisticsController.bookShipment);

/* ─────────────────────────────────────────────────────────────
   GET SHIPMENT
───────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/logistics/shipment/{orderId}:
 *   get:
 *     summary: Get shipment details by order ID
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipment details retrieved
 */
router.get("/shipment/:orderId", auth, logisticsController.getShipment);

/* ─────────────────────────────────────────────────────────────
   REFERENCE DATA
───────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/logistics/categories:
 *   get:
 *     summary: Get package categories
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/categories", 
   auth,
   logisticsController.getCategories);

/**
 * @swagger
 * /api/logistics/boxes:
 *   get:
 *     summary: Get available box sizes
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of box sizes
 */
router.get("/boxes", auth, logisticsController.getBoxSizes);

/**
 * @swagger
 * /api/logistics/couriers:
 *   get:
 *     summary: Get available couriers
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of couriers
 */
router.get("/couriers", auth, logisticsController.getCouriers);

/* ─────────────────────────────────────────────────────────────
   ADMIN ONLY
───────────────────────────────────────────────────────────── */

/**
 * @swagger
 * /api/logistics/validate-address/{addressId}:
 *   post:
 *     summary: Validate address with ShipBubble (Admin only)
 *     tags: [Logistics - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address validated
 */
router.post(
  "/validate-address/:addressId",
  auth,
authorizeRole("SuperAdmin"),
  logisticsController.validateAddress
);

/**
 * @swagger
 * /api/logistics/wallet:
 *   get:
 *     summary: Get ShipBubble wallet balance (Admin only)
 *     tags: [Logistics - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved
 */
router.get(
  "/wallet",
  auth,
  authorizeRole("SuperAdmin"),
  logisticsController.getWalletBalance
);

module.exports = router;