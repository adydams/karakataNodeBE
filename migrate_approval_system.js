const { sequelize } = require("./models");

async function add(table, column, sql) {
  const [rows] = await sequelize.query(`DESCRIBE ${table}`);
  if (!rows.some((row) => row.Field === column)) await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${sql}`);
}

async function migrate() {
  try {
    await add("system_settings", "productApprovalRequired", "`productApprovalRequired` TINYINT(1) NOT NULL DEFAULT 0");
    await add("system_settings", "productApprovalSlaEnabled", "`productApprovalSlaEnabled` TINYINT(1) NOT NULL DEFAULT 1");
    await add("system_settings", "productApprovalSlaHours", "`productApprovalSlaHours` INT NOT NULL DEFAULT 48");
    await add("system_settings", "orderItemApprovalWindowHours", "`orderItemApprovalWindowHours` INT NOT NULL DEFAULT 24");
    await add("system_settings", "missedApprovalEscalationThreshold", "`missedApprovalEscalationThreshold` INT NOT NULL DEFAULT 3");
    await add("system_settings", "missedApprovalWindowDays", "`missedApprovalWindowDays` INT NOT NULL DEFAULT 30");
    await add("system_settings", "autoUnlistAfterMissedApprovals", "`autoUnlistAfterMissedApprovals` TINYINT(1) NOT NULL DEFAULT 0");
    await add("products", "status", "`status` ENUM('pending_review','approved','rejected') NOT NULL DEFAULT 'approved'");
    await add("products", "rejectionReason", "`rejectionReason` VARCHAR(500) NULL");
    await add("products", "approvalDeadline", "`approvalDeadline` DATETIME NULL");
    await add("products", "approvalReviewedBy", "`approvalReviewedBy` CHAR(36) NULL");
    await add("products", "approvalReviewedAt", "`approvalReviewedAt` DATETIME NULL");
    await add("return_requests", "returnRateRequestToken", "`returnRateRequestToken` VARCHAR(255) NULL");
    await add("orderitems", "approvalStatus", "`approvalStatus` ENUM('pending','approved','expired','declined') NOT NULL DEFAULT 'pending'");
    await add("orderitems", "approvalDeadline", "`approvalDeadline` DATETIME NULL");
    await add("orderitems", "approvalRespondedAt", "`approvalRespondedAt` DATETIME NULL");
    await add("orderitems", "approvalReason", "`approvalReason` VARCHAR(255) NULL");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS missed_approval_logs (
        id CHAR(36) NOT NULL PRIMARY KEY,
        orderItemId CHAR(36) NOT NULL,
        productId CHAR(36) NOT NULL,
        storeId CHAR(36) NOT NULL,
        occurredAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX missed_approval_item_idx (orderItemId),
        INDEX missed_approval_store_idx (storeId)
      )
    `);
    await add("refund_logs", "retryCount", "`retryCount` INT NOT NULL DEFAULT 0");
    await add("refund_logs", "lastAttemptAt", "`lastAttemptAt` DATETIME NULL");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS refund_logs (
        id CHAR(36) NOT NULL PRIMARY KEY,
        orderItemId CHAR(36) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        paystackRefundId VARCHAR(255) NULL,
        status ENUM('initiated','processing','completed','failed') NOT NULL DEFAULT 'initiated',
        reason VARCHAR(255) NOT NULL,
        failureReason TEXT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX refund_logs_order_item_idx (orderItemId)
      )
    `);
    console.log("Approval system migration complete.");
  } catch (error) {
    console.error("Approval system migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();
