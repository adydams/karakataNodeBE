const { Wallet, WalletTransaction, Payout, Store, SystemSetting } = require("../models");
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
        const store = await Store.findByPk(product.storeId);
        if (!store) throw new Error(`Store for product ${item.productId} not found`);

        const rate = store.commissionRate ?? setting.defaultCommissionRate;

        // Create wallet if it doesn't exist
        const [wallet] = await Wallet.findOrCreate({
          where: { storeId: store.id },
          defaults: { storeId: store.id },
          transaction: t,
        });

        const subtotal = item.subtotal;
        const commissionAmount = parseFloat((subtotal * (rate / 100)).toFixed(2));
        const netAmount = parseFloat((subtotal - commissionAmount).toFixed(2));

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
          settlesAt: sequelize.literal(`DATE_ADD(NOW(), INTERVAL ${store.returnWindowDays ?? setting.returnWindowDays} DAY)`),
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
  async settleMaturedTransactions() {
    const t = await sequelize.transaction();
    try {
      const matured = await WalletTransaction.findAll({
        where: {
          status: "PENDING",
          settlesAt: { [Op.lte]: new Date() },
        },
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
}

module.exports = new WalletService();
