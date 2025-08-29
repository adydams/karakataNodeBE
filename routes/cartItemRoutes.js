const express = require('express');
const router = express.Router();
const cartItemController = require('../controllers/cartItemController');

/**
 * @swagger
 * /cart-items:
 *   post:
 *     summary: Add item to cart
 *     tags: [CartItems]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cartId, productId]
 *             properties:
 *               cartId:
 *                 type: integer
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Item added
 */
router.post('/', cartItemController.addItem.bind(cartItemController));

/**
 * @swagger
 * /cart-items/{id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [CartItems]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Item removed
 */
router.delete('/:id', cartItemController.removeItem.bind(cartItemController));

/**
 * @swagger
 * /cart-items/{id}:
 *   patch:
 *     summary: Update item quantity
 *     tags: [CartItems]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Quantity updated
 */
router.patch('/:id', cartItemController.updateQuantity.bind(cartItemController));

/**
 * @swagger
 * /cart-items/cart/{cartId}:
 *   get:
 *     summary: Get all items in a cart
 *     tags: [CartItems]
 *     parameters:
 *       - name: cartId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of cart items
 */
router.get('/cart/:cartId', cartItemController.getCartItems.bind(cartItemController));

module.exports = router;
