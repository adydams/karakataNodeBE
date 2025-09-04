"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // await queryInterface.addColumn("products", "subCategoryId", {
    //   type: Sequelize.UUID,
    //   allowNull: true,
    //   references: {
    //     model: "subcategories", // check your DB for actual table name
    //     key: "id",
    //   },
    //   onUpdate: "CASCADE",
    //   onDelete: "SET NULL",
    //});
  },

  async down(queryInterface, Sequelize) {
    //await queryInterface.removeColumn("products", "subCategoryId");
  },
};
