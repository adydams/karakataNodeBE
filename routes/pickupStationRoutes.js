// routes/pickupStationRoutes.js

const express = require("express");
const router = express.Router();

const controller =
  require("../controllers/pickupStationController");

const { auth } =
  require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: PickupStations
 *   description: Store pickup station management (used for logistics & shipping rates)
 */


/**
 * =========================
 * CREATE PICKUP STATION
 * =========================
 */

/**
 * @swagger
 * /api/pickup-stations:
 *   post:
 *     summary: Create a pickup station for a store
 *     tags: [PickupStations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - name
 *               - address
 *               - phone
 *             properties:
 *               storeId:
 *                 type: string
 *                 example: "uuid-store-id"
 *               name:
 *                 type: string
 *                 example: "Lekki Warehouse"
 *               contactPerson:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *               email:
 *                 type: string
 *                 example: "store@email.com"
 *               address:
 *                 type: string
 *                 example: "12 Admiralty Way, Lekki"
 *               isDefault:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Pickup station created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", auth, controller.create);


/**
 * =========================
 * GET ALL PICKUP STATIONS
 * =========================
 */

/**
 * @swagger
 * /api/pickup-stations:
 *   get:
 *     summary: Get all pickup stations
 *     tags: [PickupStations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pickup stations
 */
router.get("/", auth, controller.getAll);


/**
 * =========================
 * GET BY STORE
 * =========================
 */

/**
 * @swagger
 * /api/pickup-stations/store/{storeId}:
 *   get:
 *     summary: Get all pickup stations for a store
 *     tags: [PickupStations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store pickup stations
 */
router.get("/store/:storeId", auth, controller.getByStore);


/**
 * =========================
 * GET SINGLE
 * =========================
 */

/**
 * @swagger
 * /api/pickup-stations/{id}:
 *   get:
 *     summary: Get pickup station by ID
 *     tags: [PickupStations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pickup station details
 *       404:
 *         description: Not found
 */
router.get("/:id", auth, controller.getOne);


/**
 * =========================
 * UPDATE
 * =========================
 */

/**
 * @swagger
 * /api/pickup-stations/{id}:
 *   put:
 *     summary: Update pickup station
 *     tags: [PickupStations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put("/:id", auth, controller.update);


/**
 * =========================
 * DELETE (soft delete)
 * =========================
 */

/**
 * @swagger
 * /api/pickup-stations/{id}:
 *   delete:
 *     summary: Delete pickup station (soft delete)
 *     tags: [PickupStations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.delete("/:id", auth, controller.delete);

module.exports = router;