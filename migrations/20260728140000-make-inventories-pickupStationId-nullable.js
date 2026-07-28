"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make pickupStationId nullable to allow inventories without that FK
    await queryInterface.changeColumn('inventories', 'pickupStationId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'store_pickup_stations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to NOT NULL if required
    await queryInterface.changeColumn('inventories', 'pickupStationId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'store_pickup_stations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
};
