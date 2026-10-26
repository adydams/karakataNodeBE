const { sequelize } = require('./models');

async function migrate() {
  try {
    console.log('Creating shipment_events table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shipment_events (
        id VARCHAR(36) PRIMARY KEY,
        shipmentId VARCHAR(36) NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255),
        note TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (shipmentId) REFERENCES shipments(id) ON DELETE CASCADE
      );
    `);
    console.log('Table shipment_events created successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

migrate();
