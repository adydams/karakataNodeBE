const { Wallet, WalletTransaction, Payout, Store, StorePickupStation, SystemSetting } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../db/database");
const PaymentService = require("./paymentServices"); // Assume this has the Paystack Transfer API wrapper
const auditService = require("./auditService");

class WalletService {
  /**
   * Credit stores for a successful payment.
   * Part of OrderServices.verify().
   */
  async creditOnPayment(order, transaction = null) {
    const setting = await SystemSetting.findOne();
    const t = transaction || await sequelize.transaction();

    try {
      for (const item of order.items) {
        const product = await require('../models').Product.findByPk(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);
        let store = product.storeId ? await Store.findByPk(product.storeId) : null;
        if (!store && item.pickupStationId) {
          const station = await StorePickupStation.findByPk(item.pickupStationId);
          if (station?.storeId) store = await Store.findByPk(station.storeId);
        }
        if (!store) throw new Error(`Store for product ${item.productId} not found`);

        const rate = setting.defaultCommissionRate;

        // Create wallet if it doesn't exist
        const [wallet] = await Wallet.findOrCreate({
          where: { storeId: store.id },
          defaults: { storeId: store.id },
          transaction: t,
        });

        const subtotal = item.subtotal || (item.quantity * item.price);
        const commissionAmount = parseFloat((subtotal * (rate / 100)).toFixed(2));
        const netAmount = parseFloat((subtotal - commissionAmount).toFixed(2));

        const returnDays = parseInt(store.returnWindowDays ?? setting.returnWindowDays) || 5;
        const settlesAt = new Date();
        settlesAt.setDate(settlesAt.getDate() + returnDays);

        // 1. Create WalletTransaction (SALE_CREDIT)
        await WalletTransaction.create({
          walletId: wallet.id,
          storeId: store.id,
          orderId: order.id,
          orderItemId: item.id,
          type: "SALE_CREDIT",
          status: "PENDING",
          grossAmount: subtotal,
          commissionRate: rate,
          commissionAmount: commissionAmount,
          netAmount: netAmount,
          settlesAt: settlesAt,
          description: `Sale credit for order ${order.id} - item ${item.id}`,
        }, { transaction: t });

        // 2. Increment Wallet pendingBalance
        await Wallet.increment(
          { pendingBalance: netAmount },
          { where: { id: wallet.id }, transaction: t }
        );

        await auditService.log({
          userId: null,
          action: "WALLET_CREDIT",
          entityType: "Wallet",
          entityId: wallet.id,
          newValue: { pendingBalanceIncrease: netAmount, orderId: order.id }
        });
      }

      if (!transaction) await t.commit();
    } catch (err) {
      if (!transaction) await t.rollback();
      throw err;
    }
  }

  /**
   * Daily Cron: PENDING -> SETTLED
   */
  async settleMaturedTransactions(walletIds = null) {
    const t = await sequelize.transaction();
    try {
      const where = {
        status: "PENDING",
        settlesAt: { [Op.lte]: new Date() },
      };

      if (walletIds && Array.isArray(walletIds)) {
        where.walletId = { [Op.in]: walletIds };
      }

      const matured = await WalletTransaction.findAll({
        where,
        transaction: t,
      });

      for (const wt of matured) {
        const net = wt.netAmount;

        // Update Transaction status
        await wt.update({ status: "SETTLED" }, { transaction: t });

        // Move funds in Wallet: pendingBalance -> availableBalance, and add to lifetimeEarnings
        await Wallet.update(
          {
            pendingBalance: sequelize.literal(`pendingBalance - ${net}`),
            availableBalance: sequelize.literal(`availableBalance + ${net}`),
            lifetimeEarnings: sequelize.literal(`lifetimeEarnings + ${net}`)
          },
          { where: { id: wt.walletId }, transaction: t }
        );

        await auditService.log({
          userId: null,
          action: "WALLET_SETTLEMENT",
          entityType: "Wallet",
          entityId: wt.walletId,
          oldValue: { pendingBalance: "decreased" },
          newValue: { availableBalance: "increased", amount: net }
        });
      }
      await t.commit();
      return matured.length;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Weekly Cron: Trigger Payouts
   */
  async initiateScheduledPayouts() {
    const setting = await SystemSetting.findOne();
    const minAmount = setting.minimumPayoutAmount;

    const eligibleStores = await Store.findAll({
      include: [{ model: Wallet, as: 'wallet' }],
      where: {
        '$wallet.availableBalance$': { [Op.gte]: minAmount },
        payoutAccountNumber: { [Op.ne]: null },
        payoutBankCode: { [Op.ne]: null },
      }
    });

    const results = [];
    for (const store of eligibleStores) {
      const wallet = store.wallet;
      const payoutAmount = wallet.availableBalance;

      const t = await sequelize.transaction();
      try {
        // 1. Call Paystack Transfer API (Mocked via PaymentService)
        const transfer = await PaymentService.createTransfer({
          amount: payoutAmount,
          accountNumber: store.payoutAccountNumber,
          bankCode: store.payoutBankCode,
          accountName: store.payoutAccountName,
        });

        // 2. Record Payout
        const payout = await Payout.create({
          storeId: store.id,
          walletId: wallet.id,
          amount: payoutAmount,
          accountNumber: store.payoutAccountNumber,
          bankCode: store.payoutBankCode,
          accountName: store.payoutAccountName,
          paystackTransferCode: transfer.code,
          paystackTransferRef: transfer.reference,
          status: "PROCESSING",
          initiatedAt: new Date(),
        }, { transaction: t });

        // 3. Record WalletTransaction (PAYOUT_DEBIT)
        await WalletTransaction.create({
          walletId: wallet.id,
          storeId: store.id,
          type: "PAYOUT_DEBIT",
          status: "PROCESSING",
          netAmount: -payoutAmount,
          reference: transfer.reference,
          description: `Weekly payout transfer ${transfer.reference}`,
        }, { transaction: t });

        // 4. Deduct from availableBalance
        await Wallet.decrement({ availableBalance: payoutAmount }, { where: { id: wallet.id }, transaction: t });

        await t.commit();
        results.push({ storeId: store.id, amount: payoutAmount });
      } catch (err) {
        await t.rollback();
        console.error(`Payout failed for store ${store.id}:`, err.message);
      }
    }
    return results;
  }

  /**
   * Paystack Webhook: Update Payout status
   */
  async handlePayoutWebhook(transferRef, status) {
    const payout = await Payout.findOne({ where: { paystackTransferRef: transferRef } });
    if (!payout) throw new Error("Payout not found");

    const t = await sequelize.transaction();
    try {
      if (status === "success") {
        await payout.update({ status: "PAID", completedAt: new Date() }, { transaction: t });
        await WalletTransaction.update(
          { status: "COMPLETED" },
          { where: { reference: transferRef, type: "PAYOUT_DEBIT" }, transaction: t }
        );
      } else {
        await payout.update({ status: "FAILED" }, { transaction: t });
        await WalletTransaction.update(
          { status: "FAILED" },
          { where: { reference: transferRef, type: "PAYOUT_DEBIT" }, transaction: t }
        );
        // Reverse the deduction
        await Wallet.increment(
          { availableBalance: payout.amount },
          { where: { id: payout.walletId }, transaction: t }
        );
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Cancel a sale credit during returns.
   */
  async reverseEarning(walletTransactionId) {
    const wt = await WalletTransaction.findByPk(walletTransactionId);
    if (!wt || wt.type !== "SALE_CREDIT") throw new Error("Invalid wallet transaction for reversal");

    const t = await sequelize.transaction();
    try {
      const netAmount = wt.netAmount;
      const wallet = await Wallet.findByPk(wt.walletId, { transaction: t });

      if (wt.status === "PENDING") {
        await Wallet.decrement({ pendingBalance: netAmount }, { where: { id: wallet.id }, transaction: t });
      } else if (wt.status === "SETTLED") {
        await Wallet.decrement({ availableBalance: netAmount }, { where: { id: wallet.id }, transaction: t });
      } else {
        throw new Error(`Transaction status ${wt.status} cannot be reversed`);
      }

      await wt.update({ status: "CANCELLED" }, { transaction: t });

      // Create a REFUND_REVERSAL record for audit
      await WalletTransaction.create({
        walletId: wallet.id,
        storeId: wt.storeId,
        orderId: wt.orderId,
        orderItemId: wt.orderItemId,
        type: "REFUND_REVERSAL",
        status: "COMPLETED",
        netAmount: -netAmount,
        description: `Reversal of sale credit for return request`,
      }, { transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Manually adjust a store's available balance.
   */
  async adjustBalance({ walletId, amount, type, description, adminUserId }) {
    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findByPk(walletId, { transaction: t });
      if (!wallet) throw new Error("Wallet not found");

      const oldBalance = wallet.availableBalance;
      const adjustmentAmount = type === "CREDIT" ? amount : -amount;

      if (type === "DEBIT" && wallet.availableBalance < amount) {
        throw new Error("Insufficient available balance for debit adjustment");
      }

      // 1. Update Wallet balance
      await Wallet.increment({ availableBalance: adjustmentAmount }, { where: { id: walletId }, transaction: t });

      const updatedWallet = await Wallet.findByPk(walletId, { transaction: t });
      const newBalance = updatedWallet.availableBalance;

      // 2. Create Ledger Entry
      await WalletTransaction.create({
        walletId,
        type: "ADJUSTMENT",
        status: "COMPLETED",
        netAmount: adjustmentAmount,
        description: description || "Manual balance adjustment",
      }, { transaction: t });

      // 3. Log to Audit Trail
      await auditService.log({
        userId: adminUserId,
        action: type === "CREDIT" ? "BALANCE_CREDIT" : "BALANCE_DEBIT",
        entityType: "Wallet",
        entityId: walletId,
        oldValue: { availableBalance: oldBalance },
        newValue: { availableBalance: newBalance }
      });

      await t.commit();
      return { success: true, newBalance };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Process a manual payout request.
   */
  async processManualPayout({ walletId, amount, adminUserId }) {
    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findByPk(walletId, {
        include: [{ model: Store, as: 'store' }],
        transaction: t
      });

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.availableBalance < amount) throw new Error("Insufficient available balance for payout");

      const store = wallet.store;
      if (!store.payoutAccountNumber || !store.payoutBankCode) {
        throw new Error("Store payout bank details are incomplete");
      }

      // 1. Initiate Transfer via PaymentService
      const transfer = await PaymentService.createTransfer({
        amount,
        accountNumber: store.payoutAccountNumber,
        bankCode: store.payoutBankCode,
        accountName: store.payoutAccountName,
      });

      // 2. Record Payout
      const payout = await Payout.create({
        storeId: store.id,
        walletId: wallet.id,
        amount,
        accountNumber: store.payoutAccountNumber,
        bankCode: store.payoutBankCode,
        accountName: store.payoutAccountName,
        paystackTransferCode: transfer.code,
        paystackTransferRef: transfer.reference,
        status: "PROCESSING",
        initiatedAt: new Date(),
      }, { transaction: t });

      // 3. Record WalletTransaction (PAYOUT_DEBIT)
      await WalletTransaction.create({
        walletId,
        storeId: store.id,
        type: "PAYOUT_DEBIT",
        status: "PROCESSING",
        netAmount: -amount,
        reference: transfer.reference,
        description: `Manual payout initiated by admin: ${transfer.reference}`,
      }, { transaction: t });

      // 4. Deduct funds
      await Wallet.decrement({ availableBalance: amount }, { where: { id: walletId }, transaction: t });

      // 5. Log to Audit Trail
      await auditService.log({
        userId: adminUserId,
        action: "TRIGGER_PAYOUT",
        entityType: "Payout",
        entityId: payout.id,
        newValue: { amount, walletId, status: "PROCESSING" }
      });

      await t.commit();
      return { success: true, payoutId: payout.id };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new WalletService();
