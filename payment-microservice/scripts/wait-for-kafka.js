const { Kafka } = require('kafkajs');

async function waitForKafka() {
  const kafka = new Kafka({
    clientId: 'kafka-health-check',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
    connectionTimeout: 3000,
    requestTimeout: 5000,
  });

  const admin = kafka.admin();
  
  let connected = false;
  let attempts = 0;
  const maxAttempts = 30;

  console.log('🔄 Waiting for Kafka to be ready...');

  while (!connected && attempts < maxAttempts) {
    try {
      await admin.connect();
      await admin.listTopics(); // Test connection
      connected = true;
      console.log('✓ Kafka is ready!');
      await admin.disconnect();
    } catch (error) {
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Kafka not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!connected) {
    console.error('✗ Kafka failed to become ready within timeout period');
    process.exit(1);
  }
}

if (require.main === module) {
  waitForKafka().catch(console.error);
}

module.exports = { waitForKafka };