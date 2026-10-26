const { sequelize } = require("./models");

async function addColumnIfMissing(table, column, definition) {
  const [columns] = await sequelize.query(`DESCRIBE \`${table}\``);
  if (!columns.some((entry) => entry.Field === column)) {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function migrate() {
  try {
    await addColumnIfMissing("discounts", "isAutomatic", "TINYINT(1) NOT NULL DEFAULT 0");
    await addColumnIfMissing("discounts", "title", "VARCHAR(120) NULL");
    await addColumnIfMissing("discounts", "displayInAdverts", "TINYINT(1) NOT NULL DEFAULT 0");
    await addColumnIfMissing("discounts", "advertStartDate", "DATETIME NULL");
    await addColumnIfMissing("discounts", "advertEndDate", "DATETIME NULL");
    await sequelize.query("UPDATE `discounts` SET `title` = `code` WHERE `title` IS NULL OR `title` = ''");
    await sequelize.query("UPDATE `discounts` SET `displayInAdverts` = 1 WHERE `isActive` = 1 AND `isDeleted` = 0 AND (`displayInAdverts` IS NULL OR `displayInAdverts` = 0)");
    await sequelize.query("ALTER TABLE `discounts` MODIFY COLUMN `title` VARCHAR(120) NOT NULL");
    console.log("Discount title migration complete.");
  } catch (error) {
    console.error("Automatic discounts migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();
