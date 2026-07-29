const { Wallet, WalletTransaction } = require("../models");

class WalletController {
  async getBalance(req, res) {
    try {
      const storeId = req.user.storeId; // Assume user has storeId if they are StoreAdmin
      if (!storeId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const wallet = await Wallet.findOne({ where: { storeId } });
      if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

      return res.status(200).json({
        success: true,
        data: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          lifetimeEarnings: wallet.lifetimeEarnings,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getTransactions(req, res) {
    try {
      const storeId = req.user.storeId;
      if (!storeId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const transactions = await WalletTransaction.findAll({
        where: { storeId },
        order: [['createdAt', 'DESC']],
        include: [{ model: Order, as: 'order' }]
      });

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new WalletController();
