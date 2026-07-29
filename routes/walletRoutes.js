const express = require("express");
const router = express.Router();
const WalletController = require("../controllers/walletController");
const { authenticate, authorizeRole } = require("../middlewares/auth");

router.get("/balance", authenticate, authorizeRole("StoreAdmin"), WalletController.getBalance);
router.get("/transactions", authenticate, authorizeRole("StoreAdmin"), WalletController.getTransactions);

module.exports = router;
