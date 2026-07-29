const express = require("express");
const router = express.Router();
const ReturnController = require("../controllers/returnController");
const { auth, authenticate , authorizeRole } = require("../middlewares/auth");

router.post("/", authenticate, ReturnController.create);
router.get("/:id", authenticate, ReturnController.getOne);
router.patch("/:id/approve", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.approve);
router.patch("/:id/reject", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.reject);
router.patch("/:id/confirm-restock", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.confirmRestock);

module.exports = router;
