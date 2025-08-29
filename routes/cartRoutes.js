const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user cart
 *     tags: [Cart]
 */
router.get("/", cartController.getCart);

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add product to cart
 *     tags: [Cart]
 */
router.post("/add", cartController.addItem);

/**
 * @swagger
 * /cart/remove:
 *   post:
 *     summary: Remove product from cart
 *     tags: [Cart]
 */
router.post("/remove", cartController.removeItem);

module.exports = router;
