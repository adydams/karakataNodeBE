const { Wallet, WalletTransaction, Store, Order } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../db/database");

class AdminFinanceController {
  async getOverview(req, res) {
    return AdminFinanceController.prototype.getSummary(req, res);
  }

  /**
   * Get high-level finance summary cards.
   */
  async getSummary(req, res) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Total Gross Revenue (all settled SALE_CREDITS)
      const totalGross = await WalletTransaction.sum("grossAmount", {
        where: { type: "SALE_CREDIT", status: "SETTLED" }
      }) || 0;

      // 2. Total Commission earned by platform
      const totalCommission = await WalletTransaction.sum("commissionAmount", {
        where: { type: "SALE_CREDIT", status: "SETTLED" }
      }) || 0;

      // 3. Total Payouts processed
      const totalPayouts = await WalletTransaction.sum("netAmount", {
        where: { type: "PAYOUT_DEBIT", status: "COMPLETED" }
      }) || 0;

      // 4. Total Pending Settlements
      const pendingSettlements = await WalletTransaction.sum("netAmount", {
        where: { status: "PENDING" }
      }) || 0;

      return res.status(200).json({
        success: true,
        data: {
          totalGross,
          totalCommission,
          totalPayouts,
          pendingSettlements
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get revenue data for charts (grouped by date).
   */
  async getRevenueChart(req, res) {
    try {
      const results = await WalletTransaction.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('SUM', sequelize.col('grossAmount')), 'revenue'],
          [sequelize.fn('SUM', sequelize.col('commissionAmount')), 'commission']
        ],
        where: { type: "SALE_CREDIT", status: "SETTLED" },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true
      });

      return res.status(200).json({ success: true, data: results });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get list of recent financial transactions.
   */
  async getTransactions(req, res) {
    try {
      const { page = 1, limit = 10, status, type } = req.query;
      const offset = (page - 1) * limit;

      const where = { isDeleted: false }; // Assuming WalletTransaction has isDeleted or we just filter by status
      if (status) where.status = status;
      if (type) where.type = type;

      const { count, rows } = await WalletTransaction.findAndCountAll({
        where,
        include: [
          { model: Store, as: 'store' },
          { model: Order, as: 'order' }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.status(200).json({
        success: true,
        data: rows,
        total: count,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get stores with high pending balances for payout review.
   */
  async getPayoutRequests(req, res) {
    try {
      const wallets = await Wallet.findAll({
        where: {
          pendingBalance: { [Op.gt]: 0 }
        },
        include: [{ model: Store, as: 'store' }],
        order: [['pendingBalance', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: wallets
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getWallets(req, res) {
      try {
        const wallets = await Wallet.findAll({
          include: [{ model: Store, as: "store" }],
          order: [["updatedAt", "DESC"]],
        });
        return res.status(200).json({ success: true, data: wallets });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
      }
    }

  async getWalletDetails(req, res) {
      try {
        const wallet = await Wallet.findByPk(req.params.walletId, {
          include: [{ model: Store, as: "store" }],
        });
        if (!wallet) {
          return res.status(404).json({ success: false, message: "Wallet not found" });
        }
        return res.status(200).json({ success: true, data: wallet });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
      }
    }

  async getGlobalTransactions(req, res) {
      return AdminFinanceController.prototype.getTransactions(req, res);
    }

  async getPayouts(req, res) {
      return AdminFinanceController.prototype.getPayoutRequests(req, res);
    }

  async triggerPayout(req, res) {
      return res.status(501).json({
        success: false,
        message: "Manual payout processing is not implemented",
      });
    }

  async triggerGlobalPayout(req, res) {
      return AdminFinanceController.prototype.triggerPayout(req, res);
    }

  async adjustBalance(req, res) {
      return res.status(501).json({
        success: false,
        message: "Manual balance adjustment is not implemented",
      });
    }

  async exportFinancialReport(req, res) {
      return res.status(501).json({
        success: false,
        message: "Financial report export is not implemented",
      });
    }
}

module.exports = new AdminFinanceController();
