"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) create the join table
    await queryInterface.createTable("product_pickup_stations", {
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      pickupStationId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // 2) backfill existing associations from products.pickupStationId
    // Only insert where pickupStationId is not null
    // Use raw SQL for portability across dialects
    await queryInterface.sequelize.query(`
      INSERT INTO product_pickup_stations ("productId", "pickupStationId", "createdAt", "updatedAt")
      SELECT id, pickupStationId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM products
      WHERE pickupStationId IS NOT NULL
    `);

    // Note: We intentionally do NOT drop products.pickupStationId here.
    // Drop should be performed in a separate migration (already added by you).
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("product_pickup_stations");
  },
};
