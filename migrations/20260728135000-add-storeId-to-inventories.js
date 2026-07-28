"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add storeId column to inventories
    await queryInterface.addColumn('inventories', 'storeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Create an index for faster lookups
    await queryInterface.addIndex('inventories', ['storeId']);
  },

  down: async (queryInterface /*, Sequelize */) => {
    await queryInterface.removeIndex('inventories', ['storeId']);
    await queryInterface.removeColumn('inventories', 'storeId');
  },
};
