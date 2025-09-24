// paymentConsumer.js (payment-service)
const { Kafka } = require("kafkajs");
const PaymentServices = require("./services/paymentServices");
const { send } = require("./kafka/producer");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "payment-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || "payment-group" });

async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "order.created", fromBeginning: false });
  console.log("🚀 payment-service listening for order.created");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log("📩 Received order.created:", event.orderId);

        // initialize payment (creates Payment record + returns paymentUrl)
        // Note: PaymentServices.initialize should not call Order or User DB
        const init = await PaymentServices.initialize({
          orderId: event.orderId,
          userId: event.userId,
          amount: event.amount,
          email: event.email,
          gateway: event.gateway,
          redirectUrl: event.redirectUrl,
        });

        // After initialization we can publish a "payment.initiated" event (optional)
        const paymentInitiatedEvent = {
          type: "payment.initiated",
          orderId: event.orderId,
          paymentId: init.payment.id,
          reference: init.payment.reference,
          paymentUrl: init.paymentUrl,
          timestamp: Date.now(),
        };
        await send("payment.events", [{ value: JSON.stringify(paymentInitiatedEvent) }]);
        console.log("✅ Published payment.initiated for", event.orderId);

        // If you want to return paymentUrl to monolith synchronously, you must use REST call,
        // but with events you typically respond to client from monolith after calling payment-service API.
      } catch (err) {
        console.error("Error handling order.created:", err);
        // Optionally publish to DLQ or payment.events with failure status
      }
    },
  });
}

runConsumer().catch((err) => {
  console.error("Consumer failed:", err);
  process.exit(1);
});
