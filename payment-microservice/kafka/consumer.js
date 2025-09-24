const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "payment-service", // name of your microservice
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"], // your Kafka broker
});

const consumer = kafka.consumer({ groupId: "payment-group" });

async function connectKafka() {
  await consumer.connect();

  // ✅ Subscribe to payment initiation events
  await consumer.subscribe({ topic: "payment_init", fromBeginning: true });

  // ✅ Listen for incoming events
  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString();
      const value = message.value?.toString();

      console.log(`📩 Received message on topic ${topic}`);
      console.log("Key:", key);
      console.log("Value:", value);

      // 👉 Here you call your payment service logic
      // Example: initialize payment
      try {
        const payload = JSON.parse(value);
        console.log("Processing Payment:", payload);

        // Call your controller/service to handle this
        // e.g. PaymentService.initialize(payload)
      } catch (err) {
        console.error("❌ Error processing message:", err);
      }
    },
  });
}

module.exports = { connectKafka };
