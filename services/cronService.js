const cron = require('node-cron');
const WalletService = require('./walletServices');

/**
 * Setup scheduled tasks for the Marketplace business model.
 */
function setupMarketplaceCrons() {
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
