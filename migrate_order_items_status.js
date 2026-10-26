const sequelize = require('./db/database');
const { DataTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('Starting migration: Adding status column to orderitems...');

    // Use single quotes for MySQL string literals
    const [results] = await sequelize.query("SHOW COLUMNS FROM orderitems LIKE 'status'");

    if (results && results.length > 0) {
      console.log('Column "status" already exists in orderitems table. Skipping...');
      process.exit(0);
    }

    // Use single quotes for the DEFAULT value
    await sequelize.query("ALTER TABLE orderitems ADD COLUMN status VARCHAR(50) DEFAULT 'DELIVERED' AFTER approvalReason;");

    console.log('Successfully added "status" column to orderitems table.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
