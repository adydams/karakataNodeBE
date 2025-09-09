const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

/**
 * @swagger
 * /api/carts:
 *   post:
 *     summary: Create a new cart
 *     tags: [Carts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Cart created
 */
router.post("/", cartController.createCart);

/**
 * @swagger
 * /api/carts/{id}:
 *   get:
 *     summary: Get a cart and its items
 *     tags: [Carts]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cart retrieved
 */
router.get("/:id", cartController.getCart);

/**
 * @swagger
 * /api/carts/{id}:
 *   delete:
 *     summary: Delete a cart
 *     tags: [Carts]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cart deleted
 */
router.delete("/:id", cartController.deleteCart);
 

module.exports = router;
