const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { xss } = require("express-xss-sanitizer");

require("dotenv").config();

const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// ----------------------
// Swagger Configuration
// ----------------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Payment Microservice API",
      version: "1.0.0",
      description: "Handles payment initialization, verification, and webhooks",
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:6000",
        description: "Payment Service Dev Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ----------------------
// Middlewares
// ----------------------
app.set("view engine", "pug");

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Enable CORS
app.use(cors());

// XSS sanitize
app.use(xss());

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Swagger Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ----------------------
// API Routes
// ----------------------
app.use("/api/payments", paymentRoutes);

// Webhook routes (raw body for signature verification)
app.post(
  "/api/payments/webhook/paystack",
  express.raw({ type: "*/*" }),
  require("./controllers/paymentController").handlePaystackWebhook
);

app.post(
  "/api/payments/webhook/flutterwave",
  express.json({ type: "*/*" }),
  require("./controllers/paymentController").handleFlutterwaveWebhook
);

// ----------------------
// Error handling
// ----------------------
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
