

require('dotenv').config({ path: '.env' });

const sequelize = require('./db/database');
const app = require('./app');
const seedRolesAndPermissions = require('./seeders/seedRolesAndPermissions');

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
  try {

    console.log("🔄 Connecting to database...");

    await sequelize.authenticate();

   // console.log('✅ Database connection established successfully.');

    sequelize.sync({  alter: false }); // Set to true if you want Sequelize to automatically update the schema (use with caution in production)

   // console.log('✅ Database synchronized.');

    // optional 
    // await seedRolesAndPermissions(); 

    app.listen(port, () => {
      console.log(`🚀 App running on port ${port}`);
      console.log(`🌍 Environment: ${nodeEnv}`);
      console.log(`🌐 URL: http://localhost:${port}`);
    });

  } catch (error) {

  ////  console.error('❌ Unable to connect to the database:', error);

    process.exit(1);
  }
})();
