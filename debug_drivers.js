const { User, Role, Shipment, Order, ShipmentEvent, sequelize } = require('./models');
const { Op } = require('sequelize');

async function debug() {
  try {
    console.log('Testing getDriversSummary query...');
    const drivers = await User.findAll({
      include: [
        { model: Role, as: "role", where: { name: "Driver" } },
        { model: Shipment, as: "shipments" }
      ],
      attributes: ["id", "name", "email", "phone"]
    });
    console.log('Summary result count:', drivers.length);

    console.log('Testing getActiveDeliveries query...');
    const shipments = await Shipment.findAll({
      where: { status: { [Op.ne]: 'delivered' } },
      include: [
        { model: User, as: 'driver', attributes: ["id", "name", "phone"] },
        { 
          model: Order, 
          as: 'order', 
          include: [{ model: User, as: 'user' }] 
        },
        { model: ShipmentEvent, as: 'events' }
      ]
    });
    console.log('Active deliveries count:', shipments.length);

  } catch (error) {
    console.error('DEBUG ERROR:', error);
  } finally {
    await sequelize.close();
  }
}

debug();
