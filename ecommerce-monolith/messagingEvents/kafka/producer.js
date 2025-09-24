// kafka/producer.js
const { Kafka } = require("kafkajs");

let producer;

function getKafkaClient() {
  return new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "app",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  });
}

async function getProducer() {
  if (!producer) {
    const kafka = getKafkaClient();
    producer = kafka.producer();
    await producer.connect();
    console.log("Kafka producer connected");
  }
  return producer;
}

async function send(topic, messages) {
  const p = await getProducer();
  return p.send({ topic, messages });
}

module.exports = { getProducer, send };
