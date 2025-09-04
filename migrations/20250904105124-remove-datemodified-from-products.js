"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("products", "dateModified");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "dateModified", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    });
  },
};
