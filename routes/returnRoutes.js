const express = require("express");
const router = express.Router();
const ReturnController = require("../controllers/returnController");
const { auth, authenticate , authorizeRole } = require("../middlewares/auth");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

router.get("/", authenticate, ReturnController.getAll);
router.post("/", authenticate, upload.array("evidence"), ReturnController.create);
router.get("/:id", authenticate, ReturnController.getOne);
router.patch("/:id/approve", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.approve);
router.patch("/:id/reject", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.reject);
router.post("/:id/shipping-rates", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.getReturnRates);
router.patch("/:id/confirm-restock", authenticate, authorizeRole("StoreAdmin", "SuperAdmin"), ReturnController.confirmRestock);

module.exports = router;
