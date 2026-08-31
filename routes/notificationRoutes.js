const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middlewares/auth");

router.get("/", authenticate, notificationController.getMyNotifications);
router.patch("/:id/read", authenticate, notificationController.markAsRead);
router.patch("/read-all", authenticate, notificationController.markAllAsRead);

module.exports = router;
