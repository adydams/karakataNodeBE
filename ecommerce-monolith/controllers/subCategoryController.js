const SubCategoryService = require('../services/subCategoryServices');

class SubCategoryController {
  // Create SubCategory
  static async create(req, res) {
    try {
      const subCategory = await SubCategoryService.createSubCategory(req.body);
      res.status(201).json({ success: true, data: subCategory });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get all SubCategories
  static async getAll(req, res) {
    try {
      const subCategories = await SubCategoryService.getAllSubCategories();
      res.status(200).json({ success: true, data: subCategories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get SubCategory by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const subCategory = await SubCategoryService.getSubCategoryById(id);
      if (!subCategory) {
        return res.status(404).json({ success: false, message: 'SubCategory not found' });
      }
      res.status(200).json({ success: true, data: subCategory });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Update SubCategory
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updatedSubCategory = await SubCategoryService.updateSubCategory(id, req.body);
      if (!updatedSubCategory) {
        return res.status(404).json({ success: false, message: 'SubCategory not found' });
      }
      res.status(200).json({ success: true, data: updatedSubCategory });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Delete (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedSubCategory = await SubCategoryService.deleteSubCategory(id);
      if (!deletedSubCategory) {
        return res.status(404).json({ success: false, message: 'SubCategory not found' });
      }
      res.status(200).json({ success: true, message: 'SubCategory deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = SubCategoryController;
