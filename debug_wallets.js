const sequelize = require('./db/database');
const { Order, OrderItem, WalletTransaction, Wallet, Store, SystemSetting } = require('./models');
const WalletService = require('./services/walletServices');

async function debug() {
  try {
    const paidOrders = await Order.findAll({
      where: { status: 'PAID' },
      include: [{ model: OrderItem, as: 'items' }]
    });
    console.log('Found paid orders:', paidOrders.length);

    for (const order of paidOrders) {
      console.log('---------------------------------------------------');
      console.log('Processing Order:', order.id);

      for (const item of order.items) {
        console.log(`  Item ${item.id}: subtotal=${item.subtotal}, price=${item.price}, qty=${item.quantity}`);
      }

      try {
        await WalletService.creditOnPayment(order);
        console.log('✅ Successfully credited order:', order.id);
      } catch (e) {
        console.error('❌ Failed to credit order:', order.id, 'Error:', e.message);
      }
    }
  } catch (e) {
    console.error('Global error:', e);
  }
}

debug();
