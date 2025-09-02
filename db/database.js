// db/database.js
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');

dotenv.config({ path: './config.env' });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: process.env.POOL_ACQUIRE,
    idle: process.env.POOL_IDLE
  }
});



// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     port: parseInt(process.env.DB_PORT, 10) || 3306,
//     dialect: 'mysql',
//     logging: true,
//     pool: {
//       max: 10,
//       min: 0,
//       acquire: parseInt(process.env.POOL_ACQUIRE, 10) || 30000,
//       idle: parseInt(process.env.POOL_IDLE, 10) || 10000,
//     },
//   }
// );

module.exports = sequelize;
