require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

async function fixDb() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    console.log('Checking for productDiscountId column in orderitems table...');
    const [results] = await sequelize.query("DESCRIBE orderitems");
    const columnExists = results.some(col => col.Field === 'productDiscountId');

    if (!columnExists) {
      console.log('Column productDiscountId not found. Adding it...');
      await sequelize.query(`
        ALTER TABLE orderitems
        ADD COLUMN productDiscountId CHAR(36) NULL
      `);
      console.log('Column productDiscountId added successfully.');
    } else {
      console.log('Column productDiscountId already exists.');
    }
  } catch (err) {
    console.error('Error fixing database:', err);
  } finally {
    await sequelize.close();
  }
}

fixDb();
