const sequelize = require('./db/database');
const { Shipment, OrderItem, Order } = require('./models');

async function sync() {
  try {
    console.log('Starting synchronization: Aligning OrderItem status with Shipment status...');
    
    const shipments = await Shipment.findAll();
    console.log(`Found ${shipments.length} shipments to process.`);

    for (const shipment of shipments) {
      const itemStatus = shipment.status === 'delivered' ? 'DELIVERED' : 'PENDING';
      
      await OrderItem.update(
        { status: itemStatus },
        { where: { orderId: shipment.orderId } }
      );
    }

    // Handle items that don't have a shipment record at all (should be PENDING)
    // We do this by finding items whose orderId is not in the list of shipment orderIds
    const shipmentOrderIds = shipments.map(s => s.orderId);
    await OrderItem.update(
      { status: 'PENDING' },
      { 
        where: { 
          orderId: { [sequelize.Op.notIn]: shipmentOrderIds } 
        } 
      }
    );

    console.log('Successfully synchronized all OrderItem statuses.');
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

sync();
