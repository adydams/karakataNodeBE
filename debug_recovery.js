const { Order, Shipment, sequelize } = require('./models');

async function debug() {
  try {
    const paidShippingOrders = await Order.count({
      where: {
        status: 'PAID',
        shippingMethod: 'SHIPPING'
      }
    });

    const paidShippingOrdersWithShipments = await Order.count({
      where: {
        status: 'PAID',
        shippingMethod: 'SHIPPING'
      },
      include: [{
        model: Shipment,
        as: 'shipments',
        required: true
      }]
    });

    const totalShipments = await Shipment.count();

    console.log(`Paid orders with SHIPPING: ${paidShippingOrders}`);
    console.log(`Paid orders with SHIPPING that HAVE a shipment record: ${paidShippingOrdersWithShipments}`);
    console.log(`Total shipment records in DB: ${totalShipments}`);
    console.log(`Missing shipments: ${paidShippingOrders - paidShippingOrdersWithShipments}`);

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

debug();
