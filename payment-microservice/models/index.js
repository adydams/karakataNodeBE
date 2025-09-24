const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

// Import models directly
const Payment = require("./paymentModel");

// If you want to force DB sync on startup
sequelize
  .sync({ alter: true })
  .then(() => console.log("✓ Payment model synchronized"))
  .catch((err) => console.error("✗ Payment model sync failed:", err));

module.exports = {
  sequelize,
  Sequelize,
  Payment,
};
