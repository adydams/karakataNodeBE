const app = require("./app");
const { sequelize , connectToKafka} = require("./models"); // Sequelize setup
//const { connectKafka } = require("./kafka/consumer"); // Kafka consumer init

const PORT = process.env.PORT || 6000;


async function startServer() {
  try {
    // DB connection
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Kafka consumer
    await connectToKafka();
    console.log("✅ Kafka connected");

    // Start Express
    app.listen(PORT, () => {
      console.log(`🚀 Payment Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start Payment Service:", err);
    process.exit(1);
  }
}

startServer();
