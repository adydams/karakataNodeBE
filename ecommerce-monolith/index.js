const { Sequelize } = require("sequelize");
const { Kafka } = require("kafkajs");

// Kafka setup
const kafka = new Kafka({
  clientId: "ecommerce-monolith-service",
  brokers: ["localhost:9094"], // external listener from docker-compose
});

const consumer = kafka.consumer({ groupId: "ecommerce-monolith-service" });

const run = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({
      topic: "payment-successful",
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();
        const { userId, orderId } = JSON.parse(value);

        console.log(`ecommerce-monolith userId: ${userId}, orderId: ${orderId}`);
      },
    });
  } catch (error) {
    console.error("Kafka consumer error:", error);
  }
};

// Run consumer
run();
