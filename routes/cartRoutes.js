const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const {auth} = require("../middlewares/auth");
/**
 * @swagger
 * /api/carts:
 *   post:
 *     summary: Create a new cart
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []   # 👈 indicate JWT is required
 *     requestBody:
 *       required: false     # no body needed
 *     responses:
 *       201:
 *         description: Cart created
 *       401:
 *         description: Unauthorized (missing or invalid token)
 */
router.post("/", auth, cartController.createCart);

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
router.get("/:id", auth, cartController.getCart);

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
router.delete("/:id", auth, cartController.deleteCart);
 

module.exports = router;
