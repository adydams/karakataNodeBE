const { Sequelize } = require("sequelize");
const sequelize = require("./config/database");
const { Kafka } = require("kafkajs");

// Import models
const Payment = require("./models/paymentModel");

// Sync database (dev only)
sequelize
  .sync({ alter: true })
  .then(() => console.log("✓ Payment model synchronized"))
  .catch((err) => console.error("✗ Payment model sync failed:", err));

// Kafka setup
const kafka = new Kafka({
  clientId: "payment-service",
  brokers: ["localhost:9094"], // external listener from docker-compose
});

const producer = kafka.producer();

const connectToKafka = async () => {
  try {
    await producer.connect();
    console.log("✓ Kafka Producer Connected!");
  } catch (error) {
    console.error("✗ Error connecting Kafka:", error);
  }
};

module.exports = {
  sequelize,
  Sequelize,
  Payment,
  kafka,
  producer,        // export producer instead of non-existing admin
  connectToKafka,
};
