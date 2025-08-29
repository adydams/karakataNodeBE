const SubCategory = require('../models/subCategoryModel');
const Category = require('../models/categoryModel');

class SubCategoryServices {
  // ✅ Create SubCategory
  static async createSubCategory(data) {
    return await SubCategory.create(data);
  }

  // ✅ Get All SubCategories
  static async getAllSubCategories() {
    return await SubCategory.findAll({
      where: { isDeleted: false },
      include: [{ model: Category, as: 'category' }],
    });
  }

  // ✅ Get SubCategory by ID
  static async getSubCategoryById(id) {
    return await SubCategory.findOne({
      where: { id, isDeleted: false },
      include: [{ model: Category, as: 'category' }],
    });
  }

  // ✅ Update SubCategory
  static async updateSubCategory(id, updates) {
    const subCategory = await SubCategory.findByPk(id);
    if (!subCategory) return null;
    return await subCategory.update(updates);
  }

  // ✅ Soft Delete
  static async deleteSubCategory(id) {
    const subCategory = await SubCategory.findByPk(id);
    if (!subCategory) return null;
    subCategory.isDeleted = true;
    await subCategory.save();
    return subCategory;
  }
}

module.exports = SubCategoryServices;
