

require('dotenv').config({ path: '.env' });

const sequelize = require('./db/database');
const app = require('./app');
const seedRolesAndPermissions = require('./seeders/seedRolesAndPermissions');
const setupMarketplaceCrons = require('./services/cronService');

const port = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';

// ============================================
// UNHANDLED ERRORS
// ============================================

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});


// ============================================
// START SERVER
// ============================================

(async () => {
  // Start server immediately to display port
  app.listen(port, () => {
    console.log(`🚀 App running on port ${port}`);
    console.log(`🌍 Environment: ${nodeEnv}`);
    console.log(`🌐 URL: http://localhost:${port}`);

    // Initialize scheduled tasks
    setupMarketplaceCrons();
    console.log('📅 Marketplace cron jobs initialized');
  });

  try {
    console.log("🔄 Connecting to database...");
    await sequelize.authenticate();
    await sequelize.sync({  alter: false });
    console.log('✅ Database connection established and synchronized successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
})();
