// services/categoryService.js
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel'); // if you have SubCategory
const Product = require('../models/productModel'); 
const cloudinary = require("../config/cloudinary");
 const { fn, col } = require('sequelize');
class CategoryServices {
  // Create category
 async createCategory(data, imageFile) {
    try {
      let imageUrl = null;

      // If image provided, upload to Cloudinary
      if (imageFile) {
        const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
          folder: 'ecommerce/categories', 
          use_filename: true,
          unique_filename: false,
          resource_type: 'image',
        });

        imageUrl = uploadResult.secure_url;
      }

      // Save category
      const category = await Category.create({
        name: data.name,
        description: data.description,
        imageUrl: imageUrl,
      });

      return category;

    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`Category with name "${data.name}" already exists.`);
      }
      throw err;
    }
  }

  // Get all categories with subcategories
  // async getAllCategories() {
  //   return await Category.findAll({
  //     include: [{ model: SubCategory, as: 'subCategories' }]
  //   });
  // }

 

 async getAllCategories() {
        return await  Category.findAll({
      attributes: {
        include: [[fn('COUNT', col('subCategories.products.id')), 'totalProducts']]
      },
      include: [
        {
          model: SubCategory,
          as: 'subCategories',
          attributes: [],
          include: [
            {
              model: Product,
              as: 'products',
              attributes: []
            }
          ]
        }
      ],
      group: ['Category.id']
    });
 }

  // Get category by ID
  // async getCategoryById(id) {
  //   return await Category.findByPk(id, {
  //     include: [{ model: SubCategory, as: 'subCategories' }]
  //   });
  // }


async getCategoryById(id) {
  return await Category.findByPk(id, {
    attributes: {
      include: [
        [fn('COUNT', col('subCategories.products.id')), 'totalProducts']
      ]
    },
    include: [
      {
        model: SubCategory,
        as: 'subCategories',
        attributes: [],
        include: [
          {
            model: Product,
            as: 'products',
            attributes: []
          }
        ]
      }
    ],
    group: ['Category.id']
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
