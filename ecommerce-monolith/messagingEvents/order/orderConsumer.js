const { Kafka } = require("kafkajs");
const { Order } = require("../models");

const kafka = new Kafka({
  clientId: "order-service",
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "order-group" });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.events", fromBeginning: false });

  console.log("🚀 Order Service listening for payment.events...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log("📩 Received Payment Event:", event);

      const order = await Order.findByPk(event.orderId);
      if (!order) return;

      if (event.type === "payment.success") {
        await order.update({ status: "PAID", paymentStatus: "paid" });
      } else if (event.type === "payment.failed") {
        await order.update({ status: "FAILED", paymentStatus: "failed" });
      }

      console.log(`✅ Order ${order.id} updated with payment status ${order.paymentStatus}`);
    },
  });
}

run().catch(console.error);

module.exports = { run };
