// orderPaymentListener.js (order-service)
const { Kafka } = require("kafkajs");
const { Order } = require("../models");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "order-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID_ORDER || "order-payment-listener" });

async function runListener() {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const evt = JSON.parse(message.value.toString());
      console.log("📩 Received payment event:", evt);

      if (evt.type === "payment.success") {
        await Order.update(
          { status: "PAID", paymentReference: evt.reference },
          { where: { id: evt.orderId } }
        );
      } else if (evt.type === "payment.failed") {
        await Order.update(
          { status: "FAILED", paymentReference: evt.reference },
          { where: { id: evt.orderId } }
        );
      }
    },
  });
}

runListener().catch((err) => {
  console.error("Order payment listener failed:", err);
  process.exit(1);
});
