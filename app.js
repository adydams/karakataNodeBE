// 

// app.js
//const path = require('path');
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
 // Debug logs

// const orderRoutes = require('./routes/orderRoutes');
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
const shippingRoutes = require('./routes/shippingRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');

const app = express();
const allowedOrigins = [
  "http://localhost:5173",      // local dev
  "http://localhost:5174",
  "https://karakatang.vercel.app" // production frontend
];
// Swagger configuration
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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // optional, just to document the format
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './app.js'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);


// View Engine
app.set('view engine', 'pug');

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}




app.use(
  cors({
    origin: "*",
  })
);

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true, // if you use cookies/sessions
//   })
// );
// Enable CORS
// app.use(
//   cors({
//     origin: process.env.BASE_URL || '*',
//     credentials: true,
//   })
// );

// XSS sanitize
app.use(xss());

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/cart-items', cartItemRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/favorite', favoriteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/permission', adminPermissionRoutes);
// Webhook for payments (Paystack + Flutterwave)
app.post("/api/payments/webhook", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const event = req.body;

    // Handle Flutterwave Webhook
    if (req.headers["verif-hash"] === process.env.FLW_SECRET_HASH) {
      // TODO: Update order paymentStatus here
      return res.status(200).send("Webhook received");
    }

    // Handle Paystack Webhook
    if (req.headers["x-paystack-signature"]) {
      console.log("Paystack Webhook:", event);
      // TODO: Verify with crypto and update order status
      return res.status(200).send("Webhook received");
    }

    return res.status(400).send("Invalid webhook");
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).send("Webhook Error");
  }
});

// Fallback route
// app.all('*', (req, res) => {
//   res.status(404).json({ status: 'fail', message: `Can't find ${req.originalUrl} on this server!` });
// });



module.exports = app;
