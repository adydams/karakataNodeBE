const cron = require('node-cron');
const WalletService = require('./walletServices');
const OrderApprovalService = require('./orderApprovalService');
const { Op } = require('sequelize');
const { Product, User, Role, MissedApprovalLog, SystemSetting } = require('../models');
const NotificationService = require('./notificationService');

/**
 * Setup scheduled tasks for the Marketplace business model.
 */
function setupMarketplaceCrons() {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const count = await OrderApprovalService.expirePendingItems();
      if (count) console.log(`[Cron] Expired ${count} pending order items.`);
    } catch (err) {
      console.error('[Cron] Error in order approval expiry job:', err);
    }
  });
  cron.schedule('*/20 * * * *', async () => {
    try {
      const count = await OrderApprovalService.retryFailedRefunds();
      if (count) console.log(`[Cron] Retried ${count} failed refunds.`);
    } catch (err) {
      console.error('[Cron] Error retrying failed refunds:', err);
    }
  });
  cron.schedule('5 * * * *', async () => {
    try {
      const setting = await SystemSetting.findOne();
      const threshold = Number(setting?.missedApprovalEscalationThreshold || 3);
      const windowDays = Number(setting?.missedApprovalWindowDays || 30);
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
      const logs = await MissedApprovalLog.findAll({ where: { occurredAt: { [Op.gte]: since } }, attributes: ["productId"] });
      const counts = logs.reduce((result, log) => {
        result[log.productId] = (result[log.productId] || 0) + 1;
        return result;
      }, {});
      for (const [productId, count] of Object.entries(counts)) {
        if (count >= threshold && setting?.autoUnlistAfterMissedApprovals) {
          await Product.unscoped().update({ isDeleted: true }, { where: { id: productId } });
        }
      }
    } catch (err) {
      console.error('[Cron] Error in missed approval escalation job:', err);
    }
  });
  cron.schedule('*/15 * * * *', async () => {
    try {
      const overdue = await Product.findAll({
        where: { status: "pending_review", approvalDeadline: { [Op.lt]: new Date() }, isDeleted: false },
        attributes: ["id", "name", "approvalDeadline"],
      });
      if (overdue.length) {
        console.warn(`[Cron] ${overdue.length} product approvals have exceeded their SLA.`);
        const admins = await User.findAll({
          include: [{ model: Role, as: "role", where: { name: { [Op.in]: ["Admin", "SuperAdmin", "SystemAdmin"] } } }],
          attributes: ["id"],
        });
        await Promise.all(admins.map((admin) => NotificationService.notify(admin.id, {
          type: "PRODUCT_APPROVAL_SLA_OVERDUE",
          title: "Product approvals overdue",
          message: `${overdue.length} product approval(s) have exceeded their configured SLA.`,
          metadata: { productIds: overdue.map((product) => product.id) },
        })));
      }
    } catch (err) {
      console.error('[Cron] Error in product approval SLA job:', err);
    }
  });
  // 1. Daily Settlement Job
  // Runs every day at 00:01 AM
  cron.schedule('1 0 * * *', async () => {
    console.log('[Cron] Starting Daily Settlement Job...');
    try {
      const settledCount = await WalletService.settleMaturedTransactions();
      console.log(`[Cron] Daily Settlement Job completed. ${settledCount} transactions settled.`);
    } catch (err) {
      console.error('[Cron] Error in Daily Settlement Job:', err);
    }
  });

  // 2. Weekly Payout Job
  // Runs every Monday at 09:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Cron] Starting Weekly Payout Job...');
    try {
      const payoutResults = await WalletService.initiateScheduledPayouts();
      console.log(`[Cron] Weekly Payout Job completed. Processed ${payoutResults.length} stores.`);
    } catch (err) {
      console.error('[Cron] Error in Weekly Payout Job:', err);
    }
  });
}

module.exports = setupMarketplaceCrons;
