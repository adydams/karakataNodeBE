'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('products', 'qrCode', {
      type: Sequelize.TEXT, // change from STRING to TEXT
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('products', 'qrCode', {
      type: Sequelize.STRING(255), // revert back
      allowNull: true
    });
  }
};
