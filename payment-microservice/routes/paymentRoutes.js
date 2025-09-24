// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { auth } = require('../../ecommerce-monolith/middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment microservice endpoints
 */

/**
 * @swagger
 * /api/payments/initialize:
 *   post:
 *     summary: Initialize a new payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - userId
 *               - amount
 *               - gateway
 *             properties:
 *               orderId:
 *                 type: string
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               email:
 *                 type: string
 *               gateway:
 *                 type: string
 *                 enum: [paystack, flutterwave]
 *               redirectUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *       400:
 *         description: Bad request
 */
router.post("/initialize", auth, PaymentController.initializePayment);

/**
 * @swagger
 * /api/payments/webhook/paystack:
 *   post:
 *     summary: Paystack webhook callback
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook handled successfully
 *       400:
 *         description: Invalid signature or bad request
 */
router.post("/webhook/paystack", PaymentController.handlePaystackWebhook);

/**
 * @swagger
 * /api/payments/webhook/flutterwave:
 *   post:
 *     summary: Flutterwave webhook callback
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook handled successfully
 *       400:
 *         description: Invalid signature or bad request
 */
router.post("/webhook/flutterwave", PaymentController.handleFlutterwaveWebhook);

/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify payment status by reference
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment reference code
 *     responses:
 *       200:
 *         description: Payment verification result
 *       404:
 *         description: Payment not found
 */
router.get("/verify/:reference", auth, PaymentController.verifyPayment);

module.exports = router;