const { sequelize } = require("./models");

async function addColumnIfMissing(table, column, definition) {
  const [columns] = await sequelize.query(`DESCRIBE \`${table}\``);
  if (!columns.some((entry) => entry.Field === column)) {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function migrate() {
  try {
    await addColumnIfMissing("orders", "discountId", "CHAR(36) NULL");
    await addColumnIfMissing("orders", "discountAmount", "DECIMAL(12,2) NOT NULL DEFAULT 0");
    await sequelize.query(
      "ALTER TABLE `notifications` MODIFY COLUMN `type` ENUM('ORDER_PLACED','ORDER_PAID','ORDER_SHIPPED','ORDER_DELIVERED','ORDER_ITEM_APPROVAL_REQUIRED','ORDER_ITEM_APPROVAL_MISSED','REFUND_FAILED','PRODUCT_APPROVAL_SLA_OVERDUE','LOW_STOCK','DISCOUNT_APPLIED','GENERAL') NOT NULL"
    );
    console.log("Checkout feature migration complete.");
  } catch (error) {
    console.error("Checkout feature migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();
