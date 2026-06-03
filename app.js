const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { xss } = require('express-xss-sanitizer');

require("dotenv").config();

const paymentRoutes = require('./routes/paymentRoutes');
const brandRoutes = require('./routes/brandRoutes');
const cartRoutes = require('./routes/cartRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const storeRoutes = require('./routes/storeRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const productRoutes = require('./routes/productRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const cartItemRoutes = require('./routes/cartItemRoutes');
//const shippingRoutes = require('./routes/shippingRoutes');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');
const addressesRoutes = require('./routes/addressRoutes');
const adminRoutes = require('./routes/adminRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');

const app = express();

const allowedOrigins = [
  "http://localhost:5000", 
  "http://localhost:5173",
  "http://localhost:5174",
  "https://karakatang.vercel.app"
];

// app.get('/ping', (req, res) => {
//   res.json({ status: 'ok' });
// });

// ============================================
// GLOBAL REQUEST LOGGER
// ============================================

app.use((req, res, next) => {
  const start = Date.now();

  // console.log("\n==================================");
  // console.log("📥 Incoming Request");
  // console.log("Method:", req.method);
  // console.log("URL:", req.originalUrl);
  // console.log("IP:", req.ip);
  // console.log("Time:", new Date().toISOString());

  // request timeout detector
  const timeout = setTimeout(() => {
    console.log(`⏰ Request taking too long: ${req.method} ${req.originalUrl}`);
  }, 10000);

  res.on("finish", () => {
    clearTimeout(timeout);

    const duration = Date.now() - start;

    // console.log(
    //   `✅ ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    // );
    console.log("==================================\n");
  });

  res.on("close", () => {
    //console.log(`❌ Connection closed for ${req.originalUrl}`);
  });

  next();
});


// ============================================
// SECURITY
// ============================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);


// ============================================
// MORGAN LOGGER
// ============================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// ============================================
// CORS
// ============================================

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


// ============================================
// XSS
// ============================================

app.use(xss());


// ============================================
// WEBHOOK ROUTE
// MUST COME BEFORE express.json()
// ============================================

app.post(
  "/api/payments/webhook",
  express.raw({ type: "*/*" }),
  (req, res) => {
    try {
      console.log("📦 Webhook Hit");

      if (req.headers["verif-hash"] === process.env.FLW_SECRET_HASH) {
        console.log("Flutterwave webhook received");
        return res.status(200).send("Webhook received");
      }

      if (req.headers["x-paystack-signature"]) {
        console.log("Paystack webhook received");
        return res.status(200).send("Webhook received");
      }

      return res.status(400).send("Invalid webhook");

    } catch (err) {
      console.error("Webhook Error:", err);

      return res.status(500).send("Webhook Error");
    }
  }
);


// ============================================
// BODY PARSERS
// ============================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// ============================================
// OTHER MIDDLEWARE
// ============================================

app.use(cookieParser());
app.use(compression());


// ============================================
// REQUEST TIMESTAMP
// ============================================

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});


// ============================================
// SWAGGER
// ============================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Karakata API',
      version: '1.0.0',
      description: 'API documentation for Karakata Node.js Backend',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js', './app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// ============================================
// ROUTE DEBUG LOGGER
// THIS SHOWS WHETHER REQUEST ENTERED ROUTER
// ============================================

const routeLogger = (routeName) => (req, res, next) => {
  console.log(`➡️ Entered Route: ${routeName}`);
  next();
};


// ============================================
// ROUTES
// ============================================

app.use('/api/auth', routeLogger('AUTH'), authRoutes);
app.use('/api/brands', routeLogger('BRANDS'), brandRoutes);
app.use('/api/carts', routeLogger('CARTS'), cartRoutes);
app.use('/api/cart-items', routeLogger('CART ITEMS'), cartItemRoutes);
app.use('/api/category', routeLogger('CATEGORY'), categoryRoutes);
app.use('/api/favorite', routeLogger('FAVORITE'), favoriteRoutes);
app.use('/api/orders', routeLogger('ORDERS'), orderRoutes);
app.use('/api/payments', routeLogger('PAYMENTS'), paymentRoutes);
app.use('/api/products', routeLogger('PRODUCTS'), productRoutes);
app.use('/api/reviews', routeLogger('REVIEWS'), reviewRoutes);
app.use('/api/stores', routeLogger('STORES'), storeRoutes);
app.use('/api/subcategories', routeLogger('SUBCATEGORIES'), subCategoryRoutes);
app.use('/api/users', routeLogger('USERS'), userRoutes);
//app.use('/api/shipping', routeLogger('SHIPPING'), shippingRoutes);
app.use('/api/permission', routeLogger('PERMISSION'), adminPermissionRoutes);
app.use('/api/addresses', routeLogger('ADDRESSES'), addressesRoutes);
app.use('/api/logistics', routeLogger('LOGISTICS'), logisticsRoutes);
app.use('/api/admin', routeLogger('ADMIN'), adminRoutes);



// ============================================
// 404 HANDLER
// ============================================

app.all('*path', (req, res) => {
  console.log("❌ Route Not Found");

  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl}`,
  });
});


// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;