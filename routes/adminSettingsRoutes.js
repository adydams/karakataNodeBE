const express = require("express");
const router = express.Router();
const AdminSettingsController = require("../controllers/adminSettingsController");
const { authenticate, authorizeRole } = require("../middlewares/auth");

router.get("/settings", authenticate, authorizeRole("SuperAdmin"), AdminSettingsController.getSettings);
router.patch("/settings", authenticate, authorizeRole("SuperAdmin"), AdminSettingsController.updateSettings);
router.patch("/stores/:id/commission", authenticate, authorizeRole("SuperAdmin"), AdminSettingsController.updateStoreCommission);

module.exports = router;
