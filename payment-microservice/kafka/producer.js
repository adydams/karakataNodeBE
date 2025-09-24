const { Kafka } = require("kafkajs");

let producer;
let kafka;

function getKafkaClient() {
  if (!kafka) {
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || "payment-microservice",
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
      connectionTimeout: 3000,
      authenticationTimeout: 1000,
      reauthenticationThreshold: 10000,
      requestTimeout: 30000,
      enforceRequestTimeout: false,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        factor: 0.2,
        multiplier: 2,
        restartOnFailure: async (e) => {
          console.error('Kafka connection failed, restarting...', e);
          return true;
        }
      }
    });
  }
  return kafka;
}

async function getProducer() {
  if (!producer) {
    const kafkaClient = getKafkaClient();
    producer = kafkaClient.producer({
      maxInFlightRequests: 1,
      idempotent: false,
      transactionTimeout: 30000,
    });
    
    try {
      await producer.connect();
      console.log("✓ Kafka producer connected successfully");
    } catch (error) {
      console.error("✗ Failed to connect Kafka producer:", error.message);
      producer = null;
      throw error;
    }
  }
  return producer;
}

async function send(topic, messages) {
  try {
    const p = await getProducer();
    const result = await p.send({ topic, messages });
    console.log(`✓ Message sent to topic '${topic}'`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to send message to topic '${topic}':`, error.message);
    throw error;
  }
}

async function disconnect() {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log("Kafka producer disconnected");
  }
}

// Graceful shutdown
process.on('SIGTERM', disconnect);
process.on('SIGINT', disconnect);

module.exports = { getProducer, send, disconnect };