"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("products", "dateAdded");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "dateAdded", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
  },
};
