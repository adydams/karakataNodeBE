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

      // 1. Platform Revenue (All commissions earned)
      const totalPlatformRevenue = await WalletTransaction.sum("commissionAmount", {
        where: { type: "SALE_CREDIT" }
      }) || 0;

      // 2. Total Store Earnings (All net amounts earned)
      const totalStoreEarnings = await WalletTransaction.sum("netAmount", {
        where: { type: "SALE_CREDIT" }
      }) || 0;

      // 3. Total Pending Balance (All pending net amounts)
      const totalPendingBalance = await WalletTransaction.sum("netAmount", {
        where: { status: "PENDING" }
      }) || 0;

      // 4. Total Available Balance (Actual liquidity in all wallets)
      const totalAvailableBalance = await Wallet.sum("availableBalance") || 0;
      const totalVatCollected = await Order.sum("vatAmount", {
        where: { status: "PAID" }
      }) || 0;

      return res.status(200).json({
        success: true,
        data: {
          totalPlatformRevenue,
          totalStoreEarnings,
          totalPendingBalance,
          totalAvailableBalance,
          totalVatCollected
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
          [sequelize.fn('SUM', sequelize.col('grossAmount')), 'totalRevenue'],
          [sequelize.fn('SUM', sequelize.col('commissionAmount')), 'platformRevenue']
        ],
        where: { type: "SALE_CREDIT" },
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

      const where = {};
      if (status) where.status = status;
      if (type) where.type = type;

      const { count, rows } = await WalletTransaction.findAndCountAll({
        where,
        include: [
          { model: Store, as: 'store' },
          {
            model: Order,
            as: 'order',
            include: [{ model: require("../models").Payment, as: 'payment' }]
          }
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

  async getSettlementEligible(req, res) {
    try {
      const wallets = await Wallet.findAll({
        include: [{ model: Store, as: "store" }],
        where: {
          // Wallet has some pending balance
          pendingBalance: { [Op.gt]: 0 }
        }
      });

      const eligible = [];
      for (const wallet of wallets) {
        const maturedTxs = await WalletTransaction.findAll({
          where: {
            walletId: wallet.id,
            status: "PENDING",
            settlesAt: { [Op.lte]: new Date() }
          }
        });

        if (maturedTxs.length > 0) {
          const amount = maturedTxs.reduce((sum, tx) => sum + (tx.netAmount || 0), 0);
          eligible.push({
            walletId: wallet.id,
            storeName: wallet.store?.name,
            storeEmail: wallet.store?.email,
            settleableAmount: amount,
            transactionCount: maturedTxs.length
          });
        }
      }

      return res.status(200).json({ success: true, data: eligible });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async confirmSettlement(req, res) {
    try {
      const { walletIds } = req.body; // Array of wallet IDs or null for all
      const WalletService = require("../services/walletServices");
      const settledCount = await WalletService.settleMaturedTransactions(walletIds);
      return res.status(200).json({
        success: true,
        message: `Successfully settled ${settledCount} matured transactions.`,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async settleWallet(req, res) {
    try {
      const { walletId } = req.params;
      const WalletService = require("../services/walletServices");
      const settledCount = await WalletService.settleMaturedTransactions([walletId]);
      return res.status(200).json({
        success: true,
        message: `Successfully settled ${settledCount} matured transactions for this store.`,
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
        const walletId = req.params.walletId;
        const wallet = await Wallet.findByPk(walletId, {
          include: [{ model: Store, as: "store" }],
        });

        if (!wallet) {
          return res.status(404).json({ success: false, message: "Wallet not found" });
        }

        const WalletTransaction = require("../models").WalletTransaction;
        const transactions = await WalletTransaction.findAll({
          where: { walletId },
          order: [['createdAt', 'DESC']],
          limit: 50
        });

        return res.status(200).json({
          success: true,
          data: {
            wallet,
            transactions
          }
        });
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
    try {
      const { walletId, amount } = req.body;
      if (!walletId || !amount) {
        return res.status(400).json({ success: false, message: "walletId and amount are required" });
      }

      const WalletService = require("../services/walletServices");
      const result = await WalletService.processManualPayout({
        walletId,
        amount: parseFloat(amount),
        adminUserId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Manual payout initiated successfully",
        data: result,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async triggerGlobalPayout(req, res) {
      return AdminFinanceController.prototype.triggerPayout(req, res);
    }

  async adjustBalance(req, res) {
    try {
      const { walletId, amount, type, description } = req.body;
      if (!walletId || !amount || !type) {
        return res.status(400).json({ success: false, message: "walletId, amount, and type are required" });
      }

      const WalletService = require("../services/walletServices");
      const result = await WalletService.adjustBalance({
        walletId,
        amount: parseFloat(amount),
        type,
        description,
        adminUserId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Balance adjusted successfully",
        data: result,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async exportFinancialReport(req, res) {
    try {
      const { WalletTransaction } = require("../models");
      const transactions = await WalletTransaction.findAll({
        order: [['createdAt', 'DESC']],
        include: [{ model: require("../models").Store, as: 'store' }]
      });

      if (!transactions || transactions.length === 0) {
        return res.status(404).json({ success: false, message: "No transactions found to export" });
      }

      // Simple CSV generation
      let csv = "Txn ID,Date,Store,Type,Gross Amount,Net Amount,Status\n";
      transactions.forEach(txn => {
        csv += `${txn.id},${txn.createdAt.toISOString()},${txn.store?.name || 'System'},${txn.type},${txn.grossAmount || 0},${txn.netAmount || 0},${txn.status}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=financial_report.csv');
      return res.send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const Payment = require("../models").Payment;
      const Order = require("../models").Order;
      const PaymentService = require("../services/paymentServices");
      const OrderServices = require("../services/orderServices");

      const payment = await Payment.findByPk(paymentId);
      if (!payment) return res.status(404).json({ success: false, message: "Payment record not found" });

      // Verify status with the gateway
      const isSuccess = await PaymentService.verifyPayment({
        gateway: payment.gateway,
        reference: payment.reference,
      });

      if (isSuccess) {
        // Sync DB state
        payment.status = "SUCCESS";
        await payment.save();

        const order = await Order.findByPk(payment.orderId);
        if (order) {
          order.status = "PAID";
          await order.save();
          // Trigger the same post-payment logic as the webhook/verify
          await OrderServices.verify(order.id);
        }

        return res.status(200).json({
          success: true,
          message: "Payment verified and order marked as PAID",
          status: "SUCCESS"
        });
      }

      return res.status(200).json({
        success: false,
        message: "Payment is not yet successful at the gateway",
        status: "PENDING"
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AdminFinanceController();
