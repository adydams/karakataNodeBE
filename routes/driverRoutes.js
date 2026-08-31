const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");
const authMiddleware = require("../middlewares/auth");

// All driver routes require authentication and DRIVER role
router.use(authMiddleware.authenticate);

router.get("/tasks", driverController.getTasks);
router.patch("/shipment/:id/status", driverController.updateStatus);

module.exports = router;
