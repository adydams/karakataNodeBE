const { DataTypes } = require("sequelize");
const sequelize = require("../db/database");

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const description = await queryInterface.describeTable(table);
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

async function renameLegacyColumn(queryInterface, table, legacy, current) {
  const description = await queryInterface.describeTable(table);
  if (!description[current] && description[legacy]) {
    await queryInterface.renameColumn(table, legacy, current);
  }
}

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  await renameLegacyColumn(queryInterface, "cart_items", "product_id", "productId");
  await renameLegacyColumn(queryInterface, "cart_items", "cart_id", "cartId");

  await addColumnIfMissing(queryInterface, "products", "approvalStatus", {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: "PENDING",
  });
  await addColumnIfMissing(queryInterface, "products", "approvalReason", {
    type: DataTypes.STRING(500), allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "products", "approvedBy", {
    type: DataTypes.UUID, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "products", "approvedAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "products", "fulfillmentMethod", {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: "RIDER_PICKUP",
  });
  await addColumnIfMissing(queryInterface, "products", "fulfillmentHubId", {
    type: DataTypes.UUID, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "orderitems", "approvalStatus", {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: "PENDING",
  });
  await addColumnIfMissing(queryInterface, "orderitems", "approvalReason", {
    type: DataTypes.STRING(500), allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "orderitems", "approvedAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "pickedUpAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "pickedUpBy", {
    type: DataTypes.UUID, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "pickedUpHubId", {
    type: DataTypes.UUID, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "refundGateway", {
    type: DataTypes.STRING(20), allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "refundStatus", {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: "NOT_STARTED",
  });
  await addColumnIfMissing(queryInterface, "return_requests", "refundFailureReason", {
    type: DataTypes.TEXT, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "refundInitiatedAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "refundCompletedAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "return_requests", "financialReversedAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "wallets", "outstandingDebt", {
    type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
  });
  await addColumnIfMissing(queryInterface, "orders", "pickupStationId", {
    type: DataTypes.UUID, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "orders", "pickupHubId", {
    type: DataTypes.UUID, allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "orders", "pickupCode", {
    type: DataTypes.STRING(12), allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "orders", "pickupCodeSentAt", {
    type: DataTypes.DATE, allowNull: true,
  });
  await queryInterface.changeColumn("return_requests", "status", {
    type: DataTypes.ENUM("PENDING", "APPROVED", "PICKED_UP", "REJECTED", "COMPLETED", "CANCELLED"),
    allowNull: false,
    defaultValue: "PENDING",
  });
  await queryInterface.changeColumn("shipments", "status", {
    type: DataTypes.ENUM(
      "pending", "accepted", "assigned", "processing", "order_received",
      "picked_up", "shipped", "in_transit", "out_for_delivery",
      "delivered", "returned", "failed", "cancelled"
    ),
    allowNull: false,
    defaultValue: "pending",
  });

  const tables = await queryInterface.showAllTables();
  if (!tables.includes("hubs")) {
    await queryInterface.createTable("hubs", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: true },
      country: { type: DataTypes.STRING(100), allowNull: true },
      lga: { type: DataTypes.STRING(100), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(254), allowNull: true },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  }
  await addColumnIfMissing(queryInterface, "hubs", "code", {
    type: DataTypes.STRING(50), allowNull: true, unique: true,
  });
  for (const [column, length] of [["state", 100], ["country", 100], ["lga", 100], ["phone", 30], ["email", 254]]) {
    await addColumnIfMissing(queryInterface, "hubs", column, {
      type: DataTypes.STRING(length), allowNull: true,
    });
  }
  await queryInterface.changeColumn("hubs", "latitude", {
    type: DataTypes.DECIMAL(10, 7), allowNull: false,
  });
  await queryInterface.changeColumn("hubs", "longitude", {
    type: DataTypes.DECIMAL(10, 7), allowNull: false,
  });
}

migrate()
  .then(() => sequelize.close())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
