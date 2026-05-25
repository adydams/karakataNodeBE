// const express = require("express");
// const router = express.Router();
// const orderController = require("../controllers/orderController");
// const { auth } = require("../middlewares/auth");

// /**
//  * @swagger
//  * tags:
//  *   name: Orders
//  *   description: Order management & checkout
//  */

// /**
//  * @swagger
//  * /api/orders/checkout:
//  *   post:
//  *     summary: Create an order and initialize payment
//  *     tags: [Orders]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - shippingAddressId
//  *               - gateway
//  *               - phone
//  *               - email
//  *             properties:
//  *               shippingAddressId:
//  *                 type: string
//  *                 format: uuid
//  *                 example: "a1b2c3d4-e5f6-7g8h-9i10-jk11lm12no13"
//  *               phone:
//  *                 type: string
//  *                 example: "+2348012345678"
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: "user@example.com"
//  *               notes:
//  *                 type: string
//  *                 example: "Leave package at the gate"
//  *               gateway:
//  *                 type: string
//  *                 enum: [paystack, flutterwave]
//  *     responses:
//  *       201:
//  *         description: Order created and payment initialized
//  *       400:
//  *         description: Bad request
//  */

// router.post("/checkout", auth, (req, res) => orderController.checkout(req, res));

// /**
//  * @swagger
//  * /api/orders/verify/{orderId}:
//  *   post:
//  *     summary: Verify payment for an order
//  *     tags: [Orders]
//  *     parameters:
//  *       - in: path
//  *         name: orderId
//  *         required: true
//  *         schema:
//  *           type: uuid
//  *         description: Order ID
//  *     responses:
//  *       200:
//  *         description: Payment verification result
//  *       400:
//  *         description: Error verifying order
//  */
// router.post("/verify/:orderId",auth, (req, res) => orderController.verify(req, res));
 
// /**
//  * @swagger
//  * /api/orders/{orderId}/invoice:
//  *   get:
//  *     summary: Get invoice details for an order
//  *     description: |
//  *       Retrieves full invoice details including:
//  *       - Order information
//  *       - Ordered items
//  *       - Payment details
//  *       
//  *       🔒 Requires authentication
//  *       
//  *       ⚠️ Only the owner of the order or an admin can access this endpoint.
//  *     tags:
//  *       - Orders
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - name: orderId
//  *         in: path
//  *         required: true
//  *         description: Unique identifier of the order
//  *         schema:
//  *           type: string
//  *           format: uuid
//  *           example: 885036e9-e4bd-4dce-bd56-4c290d82fb16
//  *     responses:
//  *       200:
//  *         description: Invoice retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 data:
//  *                   type: object
//  *       400:
//  *         description: Invalid request or order not found
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Forbidden
//  *       500:
//  *         description: Internal server error
//  */

// router.get(
//   "/:orderId/invoice",
//   auth,(req, res)=> // 🔒 protect route
//   orderController.getInvoice(req, res ) // 👈 you must implement this
// );


// module.exports = router;


const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { auth } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management & checkout
 */

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Create an order and initialize payment
 *     description: |
 *       Creates an order and initializes payment using the selected gateway.
 *       Shipping fee is verified server-side — do not send it from the client.
 *       
 *       🔒 Requires authentication
 *     tags:
 *       - Orders
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
 *               - gateway
 *               - email
 *               - shippingMethod
 *               - courierId
 *               - requestToken
 *             properties:
 *               shippingAddressId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7g8h-9i10-jk11lm12no13"
 *               gateway:
 *                 type: string
 *                 enum: [paystack, flutterwave]
 *                 example: paystack
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               notes:
 *                 type: string
 *                 example: "Leave package at the gate"
 *               shippingMethod:
 *                 type: string
 *                 enum: [SHIPPING, PICKUP]
 *                 example: SHIPPING
 *               requestToken:
 *                 type: string
 *                 description: Token from /api/logistics/rates — used server-side to verify courier fee
 *                 example: "REQ-123456789"
 *               serviceCode:
 *                 type: string
 *                 example: "EXPRESS"
 *               courierId:
 *                 type: string
 *                 example: "courier_001"
 *     responses:
 *       201:
 *         description: Order created and payment initialized
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
 *                   example: Order created, proceed to payment
 *                 order:
 *                   type: object
 *                 paymentUrl:
 *                   type: string
 *                   example: https://paystack.com/pay/abc123
 *       400:
 *         description: Bad request or invalid courier
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/orders/verify/{orderId}:
 *   post:
 *     summary: Verify payment for an order
 *     description: |
 *       Verifies the payment status of an order.
 *       
 *       🔒 Requires authentication
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Unique identifier of the order
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 885036e9-e4bd-4dce-bd56-4c290d82fb16
 *     responses:
 *       200:
 *         description: Payment verification result
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
 *                   example: Payment verified successfully
 *                 order:
 *                   type: object
 *       400:
 *         description: Error verifying order
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/verify/:orderId",
  auth,
  (req, res) => orderController.verify(req, res)
);

/**
 * @swagger
 * /api/orders/{orderId}/invoice:
 *   get:
 *     summary: Get invoice details for an order
 *     description: |
 *       Retrieves full invoice details including:
 *       - Order information
 *       - Ordered items
 *       - Payment details
 *       - Shipping information
 *       
 *       🔒 Requires authentication
 *       
 *       ⚠️ Only the owner of the order or an admin can access this endpoint.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         description: Unique identifier of the order
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 885036e9-e4bd-4dce-bd56-4c290d82fb16
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request or order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:orderId/invoice",
  auth,
  (req, res) => orderController.getInvoice(req, res)
);

module.exports = router;
