const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "order-service",
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

const producer = kafka.producer();

async function publishOrderCreated(orderPayload) {
  await producer.connect();
  await producer.send({
    topic: "order-created",
    messages: [{ value: JSON.stringify(orderPayload) }],
  });
  console.log("✅ Published OrderCreated:", orderPayload.orderId);
}

module.exports = { publishOrderCreated };
