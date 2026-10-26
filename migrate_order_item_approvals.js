const { sequelize } = require("./models");

async function migrate() {
  try {
    const [columns] = await sequelize.query("DESCRIBE orderitems");
    const names = new Set(columns.map((column) => column.Field));

    if (!names.has("approvalStatus")) {
      await sequelize.query(
        "ALTER TABLE orderitems ADD COLUMN approvalStatus ENUM('pending','approved','expired','declined') NOT NULL DEFAULT 'pending'"
      );
    }
    if (!names.has("approvalDeadline")) {
      await sequelize.query("ALTER TABLE orderitems ADD COLUMN approvalDeadline DATETIME NULL");
    }
    if (!names.has("approvalRespondedAt")) {
      await sequelize.query("ALTER TABLE orderitems ADD COLUMN approvalRespondedAt DATETIME NULL");
    }
    if (!names.has("approvalReason")) {
      await sequelize.query("ALTER TABLE orderitems ADD COLUMN approvalReason VARCHAR(255) NULL");
    }

    console.log("Order item approval columns are ready.");
  } catch (error) {
    console.error("Order item approval migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();
