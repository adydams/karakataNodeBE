"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("orderitems", "orderId", {
      type: Sequelize.UUID,
      allowNull: false,
      defaultValue: Sequelize.UUIDV4,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("orderitems", "orderId", {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
