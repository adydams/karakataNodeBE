const { Order, Shipment, ShipmentEvent, WalletTransaction, Wallet, User } = require('../models');
const WalletService = require('../services/walletServices');
const sequelize = require('../db/database');

async function repair() {
  console.log("🚀 Starting Recovery Process for PAID orders...");
  
  try {
    const paidOrders = await Order.findAll({
      where: { status: 'PAID' },
      include: [{ model: OrderItem, as: 'items' }]
    });

    console.log(`Found ${paidOrders.length} PAID orders to check.`);
    let repairedCount = 0;

    for (const order of paidOrders) {
      let needsRepair = false;

      // 1. Check for Shipment
      const shipment = await Shipment.findOne({ where: { orderId: order.id } });
      if (!shipment) {
        console.log(`Order ${order.id}: Missing shipment. Creating...`);
        const provider = order.shippingSnapshot?.courier?.id || 'shipbubble';
        
        await Shipment.create({
          orderId: order.id,
          provider: provider,
          providerOrderId: provider === 'internal' ? \`INT-\${order.id.slice(0, 8).toUpperCase()}\` : null,
          shippingFee: order.shippingFee,
          status: 'pending',
        });

        await ShipmentEvent.create({
          shipmentId: (await Shipment.findOne({ where: { orderId: order.id } })).id,
          status: 'ORDER_RECEIVED',
          location: 'Central Hub',
          note: 'Recovery: Order received and queued for pickup',
        });
        needsRepair = true;
      }

      // 2. Check for Wallet Credits
      const hasCredits = await WalletTransaction.findOne({ 
        where: { orderId: order.id, type: 'SALE_CREDIT' } 
      });
      if (!hasCredits) {
        console.log(`Order ${order.id}: Missing wallet credits. Crediting stores...`);
        await WalletService.creditOnPayment(order);
        needsRepair = true;
      }

      if (needsRepair) repairedCount++;
    }

    console.log(`\n✅ Recovery Complete. Repaired ${repairedCount} orders.`);
  } catch (err) {
    console.error("Fatal error during repair:", err);
  } finally {
    await sequelize.close();
  }
}

repair();
