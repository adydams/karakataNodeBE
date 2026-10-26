const { ShipmentEvent, sequelize } = require('./models');

async function run() {
  try {
    console.log('Syncing ShipmentEvent model...');
    await ShipmentEvent.sync({ force: false });
    console.log('ShipmentEvent table synced successfully.');
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    await sequelize.close();
  }
}

run();
