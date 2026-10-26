// controllers/categoryController.js
const categoryService = require('../services/categoryServices');
const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier');

class CategoryController {
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;
      const file = req.file;

      if (!name || !description) {
        return res.status(400).json({
          message: 'Name and description are required.',
        });
      }

      let imageUrl = null;
      if (file) {
        // Upload image to Cloudinary using a stream
        imageUrl = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'categories' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );

          streamifier.createReadStream(file.buffer).pipe(stream);
        });
      }

      // Save category to DB
      const category = await categoryService.createCategory({
        name,
        description,
        imageUrl,
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        category,
      });
    } catch (err) {
      console.error('Error creating category:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  async getAllCategories(req, res) {
    try {
      const categories = await categoryService.getAllCategories();
      res.json({ success: true, data: categories });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getCategoryById(req, res) {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      res.json({ success: true, data: category });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      res.json({ success: true, data: category });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      const category = await categoryService.deleteCategory(req.params.id);
      res.json({ success: true, message: 'Category deleted', data: category });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new CategoryController();
