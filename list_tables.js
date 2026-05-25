const sequelize = require('./db/database');

async function listTables() {
  try {
    const [results] = await sequelize.query("SHOW TABLES;");
    console.log('Existing tables:');
    console.log(results);
  } catch (error) {
    console.error('Error listing tables:', error);
  } finally {
    await sequelize.close();
  }
}

listTables();
