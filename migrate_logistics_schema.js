const { sequelize } = require("./models");

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await sequelize.query(`DESCRIBE \`${table}\``);
  if (!rows.some(row => row.Field === column)) {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`Added ${table}.${column}`);
  } else {
    console.log(`${table}.${column} already exists`);
  }
}

async function ensureShipmentStatusEnum() {
  await sequelize.query(
    "ALTER TABLE `shipments` MODIFY COLUMN `status` ENUM('pending','assigned','shipped','in_transit','delivered','failed','cancelled') NULL DEFAULT 'pending'"
  );
  console.log("shipments.status enum is up to date");
}

async function migrate() {
  try {
    await addColumnIfMissing("addresses", "latitude", "DECIMAL(10, 8) NULL");
    await addColumnIfMissing("addresses", "longitude", "DECIMAL(11, 8) NULL");
    await addColumnIfMissing("addresses", "shipbubbleAddressCode", "BIGINT NULL");
    await addColumnIfMissing("store_pickup_stations", "latitude", "DECIMAL(10, 8) NULL");
    await addColumnIfMissing("store_pickup_stations", "longitude", "DECIMAL(11, 8) NULL");
    await addColumnIfMissing("store_pickup_stations", "shipbubbleAddressCode", "BIGINT NULL");
    await addColumnIfMissing("store_pickup_stations", "email", "VARCHAR(160) NULL");
    await ensureShipmentStatusEnum();
    console.log("Logistics schema migration completed.");
  } catch (error) {
    console.error("Logistics schema migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();
