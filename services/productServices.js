const Product = require("../models/productModel");
const cloudinary = require("cloudinary").v2;

class ProductServices {
  async createProduct(data, files) {
    const t = await sequelize.transaction();
      try {
        const product = await Product.create(data, { transaction: t });

        if (files && files.length > 0) {
          const productImages = files.map(file => ({
            productId: product.id,
            url: file.path,
            public_id: file.filename
          }));
          await ProductImage.bulkCreate(productImages, { transaction: t });
        }

        const qr = await QRCode.toDataURL(`https://myshop.com/products/${product.id}`);
        await product.update({ qrCode: qr }, { transaction: t });

        await t.commit();
        return await Product.findByPk(product.id, { include: ["images"] });
      } catch (error) {
        await t.rollback();
        throw error;
      }

  }


async getAllProducts() {
  return await Product.findAll({
    include: [
      { model: Brand, as: "brand" },
      { model: SubCategory, as: "subCategory" },
      { model: Store, as: "store" },
      { model: ProductImage, as: "images" } // <-- populate images
    ]
  });
}

  async getProductById(id) {
    return await Product.findById(id)
      .populate("brandId")
      .populate("subCategoryId")
      .populate("storeId");
  }

  async updateProduct(id, updates, files) {
    if (files && files.length > 0) {
      updates.productImages = files.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    }

    if (!updates.storeId) updates.storeId = null;

    return await Product.findByIdAndUpdate(id, updates, { new: true })
      .populate("brandId")
      .populate("subCategoryId")
      .populate("storeId");
  }

   async deleteProduct(id) {
    // Find product first
    const product = await Product.findById(id).populate("images");
    if (!product) {
      throw new Error("Product not found");
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
          await Image.findByIdAndDelete(img._id); // Remove from DB too
        } catch (err) {
          console.error("Error deleting image:", err.message);
        }
      }
    }

    // Delete product
    return await Product.findByIdAndDelete(id);
  }
}

module.exports = new ProductServices();
