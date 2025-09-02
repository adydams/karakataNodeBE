// services/categoryService.js
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel'); // if you have SubCategory

class CategoryServices {
  // Create category
    async createCategory(data) {
    try {
      return await Category.create(data);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`Category with name "${data.name}" already exists.`);
      }
      throw err;
    }
  }

  // Get all categories with subcategories
  async getAllCategories() {
    return await Category.findAll({
      include: [{ model: SubCategory, as: 'subCategories' }]
    });
  }

  // Get category by ID
  async getCategoryById(id) {
    return await Category.findByPk(id, {
      include: [{ model: SubCategory, as: 'subCategories' }]
    });
  }

  // Update category
  async updateCategory(id, data) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error('Category not found');
    }
    await category.update(data);
    return category;
  }

  // Delete (soft delete) category
  async deleteCategory(id) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error('Category not found');
    }
    category.isDeleted = true;
    await category.save();
    return category;
  }
}

module.exports = new CategoryServices();
