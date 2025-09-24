"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "subCategoryId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "subcategories", // table name, check your DB
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("products", "subCategoryId");
  },
};
