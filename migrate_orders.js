const { sequelize } = require('./models');

async function migrate() {
  try {
    console.log('Checking orders table columns...');
    const [results] = await sequelize.query("DESCRIBE orders;");
    const columns = results.map(col => col.Field);
    
    if (!columns.includes('vatAmount')) {
      console.log('Adding vatAmount column...');
      await sequelize.query("ALTER TABLE orders ADD COLUMN vatAmount FLOAT DEFAULT 0;");
      console.log('Column added successfully.');
    } else {
      console.log('vatAmount already exists.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

migrate();
