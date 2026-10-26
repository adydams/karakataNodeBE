const { sequelize } = require('./models');

async function migrate() {
  try {
    console.log('Checking shipments table columns...');
    const [results] = await sequelize.query("DESCRIBE shipments;");
    const columns = results.map(col => col.Field);
    console.log('Existing columns:', columns);

    if (columns.includes('shipbubbleOrderId') && !columns.includes('providerOrderId')) {
      console.log('Renaming shipbubbleOrderId to providerOrderId...');
      await sequelize.query("ALTER TABLE shipments CHANGE COLUMN shipbubbleOrderId providerOrderId VARCHAR(255);");
    } else if (!columns.includes('providerOrderId')) {
      await sequelize.query("ALTER TABLE shipments ADD COLUMN providerOrderId VARCHAR(255);");
    }

    if (!columns.includes('provider')) {
      console.log('Adding provider column...');
      await sequelize.query("ALTER TABLE shipments ADD COLUMN provider VARCHAR(50) DEFAULT 'shipbubble';");
    }

    if (!columns.includes('providerId')) {
      console.log('Adding providerId column...');
      await sequelize.query("ALTER TABLE shipments ADD COLUMN providerId VARCHAR(36);");
    }

    if (!columns.includes('driverId')) {
      console.log('Adding driverId column...');
      await sequelize.query("ALTER TABLE shipments ADD COLUMN driverId VARCHAR(36);");
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

migrate();
