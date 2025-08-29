// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');
const { auth } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Paystack & Flutterwave payments
 */

/**
 * @swagger
 * /api/payments/initialize:
 *   post:
 *     summary: Initialize payment for an order
 *     tags: [Payments]
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
 *                 type: integer
 *               gateway:
 *                 type: string
 *                 enum: [paystack, flutterwave]
 *               redirectUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Initialization result (paymentUrl, payment record)
 */
router.post('/initialize', auth, paymentCtrl.initialize);

/**
 * @swagger
 * /api/payments/verify:
 *   get:
 *     summary: Verify payment (manual)
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, enum: [paystack, flutterwave] }
 *       - in: query
 *         name: reference
 *         schema: { type: string }
 */
router.get('/verify', paymentCtrl.verify);

/**
 * Webhook endpoints (no auth; must verify signature)
 * Paystack sends 'x-paystack-signature' header and raw JSON body
 */
router.post('/webhook/paystack', express.raw({ type: 'application/json' }), (req, res, next) => {
  // attach rawBody for controller/service
  req.rawBody = req.body.toString();
  paymentCtrl.webhookPaystack(req, res, next);
});

/**
 * Flutterwave webhook: recommended to use raw parser as well
 * Flutterwave sends 'verif-hash' header (value you set in dashboard)
 */
router.post('/webhook/flutterwave', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString();
  paymentCtrl.webhookFlutterwave(req, res, next);
});

module.exports = router;
