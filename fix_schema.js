const sequelize = require('./db/database');
const { QueryTypes } = require('sequelize');

async function fixSchema() {
  try {
    console.log('Starting schema fix...');

    // 1. Add pickupStationId column to inventories if it doesn't exist
    const [columns] = await sequelize.query(
      'SHOW COLUMNS FROM inventories LIKE "pickupStationId"',
      { type: QueryTypes.SELECT }
    );

    if (columns.length === 0) {
      console.log('Adding pickupStationId column to inventories...');
      await sequelize.query(
        'ALTER TABLE inventories ADD COLUMN pickupStationId CHAR(36) NOT NULL REFERENCES store_pickup_stations(id) ON DELETE CASCADE'
      );
      console.log('Column added successfully.');
    } else {
      console.log('Column pickupStationId already exists.');
    }

    // 2. Add the unique index
    try {
      console.log('Adding unique index inventory_product_station_unique...');
      await sequelize.query(
        'ALTER TABLE inventories ADD UNIQUE INDEX inventory_product_station_unique (productId, pickupStationId)'
      );
      console.log('Index added successfully.');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('Index already exists.');
      } else {
        throw err;
      }
    }

    console.log('Schema fix completed successfully.');
  } catch (error) {
    console.error('Error fixing schema:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixSchema();
