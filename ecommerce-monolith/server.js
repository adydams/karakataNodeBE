
require('dotenv').config({ path: './config.env' });

const sequelize = require('./db/database');
const app = require('./app');

// Import routes
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const productRoutes = require('./routes/productRoutes');
const storeRoutes = require('./routes/storeRoutes');

// Server configuration
const port = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Connect to database and start server
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    await sequelize.sync({ alter: false });
    console.log('✓ Database synchronized.');

    // Register routes
    app.use('/api/categories', categoryRoutes);
    app.use('/api/subcategories', subCategoryRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/stores', storeRoutes);

    // Start server
    app.listen(port, () => {
      console.log(`🚀 App running on port ${port}...`);
      console.log(`📊 Environment: ${nodeEnv}`);
      console.log(`🌐 Server URL: http://localhost:${port}`);

      if (nodeEnv === 'production') {
        console.log(`🔒 Running in production mode`);
      } else {
        console.log(`🔧 Running in development mode`);
      }
    });

  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    process.exit(1); // Exit if DB connection fails
  }
})();
