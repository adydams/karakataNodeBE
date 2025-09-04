const Product = require("../models/productModel");
const ProductImage = require("../models/imageModel"); // <-- add this
const Brand = require("../models/brandModel"); // <-- add this
const SubCategory  = require("../models/subCategoryModel"); // <-- add this
const Store  = require("../models/storeModel"); // <-- add this

const QRCode = require("qrcode");

const sequelize = require("../db/database"); // adjust path
const cloudinary = require("../config/cloudinary");

class ProductServices {

  async createProduct(data, files) {
    
  const t = await sequelize.transaction();
    // Basic validation (can also move to middleware/validator)
  const productImages = []; 
  try {
    const product = await Product.create(data, { transaction: t });
      
    if (files && files.length > 0) {
      
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "products",
        });

        productImages.push({
          productId: product.id,
          url: result.secure_url,
          public_id: result.public_id,
        });

       
      }
      await ProductImage.bulkCreate(productImages, { transaction: t });
    }
      // pick first image if available
    const firstImageUrl = productImages.length > 0 ? productImages[0].url : "";

    const qrPayloadUrl = `${process.env.FRONTEND_URL}/{product.id}?name=${encodeURIComponent(product.name)}&price=${product.price}&img=${encodeURIComponent(firstImageUrl)}`;
    const qrPayloadHtml = `
        <h2>${product.name}</h2>
        <p>${product.description}</p>
        <p><strong>Price:</strong> ₦${product.price}</p>
        <img src="${firstImageUrl}" width="150" />
        <br/>
        <a href="http://localhost:5173/products/${product.id}">View Product</a>
      `;

    const qrDataUrlFormatted = await QRCode.toDataURL(qrPayloadHtml, {
      width: 300,          // size
      margin: 2,           // white border
      color: {
        dark: "#000000",   // QR code color
        light: "#ffffff"   // background
      }
    });

    
      // build QR payload with details
    // const qrPayload = {
    //   url: `http://localhost:5173/products/${product.id}`,
    //   name: product.name,
    //   description: product.description,
    //   price: product.price,
    //   image: firstImageUrl,
    // };

    // generate QR code as DataURL
    //const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
    

    const uploadResponse = await cloudinary.uploader.upload(qrDataUrlFormatted, {
      folder: "qrcodes",
    });
   
    // save only the secure_url (string) in qrCode field
    await product.update({ qrCode: uploadResponse.secure_url }, { transaction: t });

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
      { model: Brand, as: "brand", required: false },       // nullable
      { model: SubCategory, as: "subcategory", required: false }, 
      { model: Store, as: "store", required: false },       // nullable
      { model: ProductImage, as: "images", required: false } // optional
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
