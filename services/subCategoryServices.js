const SubCategory = require('../models/subCategoryModel');
const Category = require('../models/categoryModel');

class SubCategoryServices {
  // ✅ Create SubCategory
  static async createSubCategory(data) {
    // ✅ Check if category exists
    const category = await Category.findByPk(data.categoryId);
    if (!category) {
      throw new Error("Category does not exist");
    }

    // ✅ Check if name already exists
    const existing = await SubCategory.findOne({ where: { name: data.name } });
    if (existing) {
      throw new Error("SubCategory name must be unique");
    }

    return await SubCategory.create(data);
  }

  // ✅ Get All SubCategories (with optional filters)
  static async getAllSubCategories({ limit, offset, search, categoryId } = {}) {
    const { Op } = require("sequelize");
    const where = { isDeleted: false };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const findOptions = {
      where,
      include: [{ model: Category, as: 'category' }],
      order: [['name', 'ASC']],
    };
    if (limit !== undefined) findOptions.limit = limit;
    if (offset !== undefined) findOptions.offset = offset;

    const { count, rows } = await SubCategory.findAndCountAll(findOptions);
    return { data: rows, total: count };
  }

  // ✅ Get SubCategories by Category ID
  static async getSubCategoriesByCategory(categoryId) {
    return await SubCategory.findAll({
      where: { categoryId, isDeleted: false },
      include: [{ model: Category, as: 'category' }],
      order: [['name', 'ASC']],
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
