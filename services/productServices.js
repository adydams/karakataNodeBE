// const Product = require("../models/productModel");
// const ProductImage = require("../models/imageModel"); // <-- add this
// const Brand = require("../models/brandModel"); // <-- add this
// const SubCategory  = require("../models/subCategoryModel"); // <-- add this
// const Category  = require("../models/categoryModel");
// const Store  = require("../models/storeModel"); // <-- add this

// const QRCode = require("qrcode");

// const sequelize = require("../db/database"); // adjust path
// const cloudinary = require("../config/cloudinary");

// class ProductServices {

//   async createProduct(data, files) {
    
//   const t = await sequelize.transaction();
//     // Basic validation (can also move to middleware/validator)
//   const productImages = []; 
//   try {
//     const product = await Product.create(data, { transaction: t });
      
//     if (files && files.length > 0) {
      
//       for (const file of files) {
//         const result = await cloudinary.uploader.upload(file.path, {
//           folder: "products",
//         });

//         productImages.push({
//           productId: product.id,
//           url: result.secure_url,
//           public_id: result.public_id,
//         });

       
//       }
//       await ProductImage.bulkCreate(productImages, { transaction: t });
//     }
//       // pick first image if available
//     const firstImageUrl = productImages.length > 0 ? productImages[0].url : "";

//     const qrPayloadUrl = `${process.env.FRONTEND_URL}/{product.id}?name=${encodeURIComponent(product.name)}&price=${product.price}&img=${encodeURIComponent(firstImageUrl)}`;
//     const qrPayloadHtml = `
//         <h2>${product.name}</h2>
//         <p>${product.description}</p>
//         <p><strong>Price:</strong> ₦${product.price}</p>
//         <img src="${firstImageUrl}" width="150" />
//         <br/>
//         <a href="http://localhost:5173/products/${product.id}">View Product</a>
//       `;

//     const qrDataUrlFormatted = await QRCode.toDataURL(qrPayloadHtml, {
//       width: 300,          // size
//       margin: 2,           // white border
//       color: {
//         dark: "#000000",   // QR code color
//         light: "#ffffff"   // background
//       }
//     });

    
//       // build QR payload with details
//     // const qrPayload = {
//     //   url: `http://localhost:5173/products/${product.id}`,
//     //   name: product.name,
//     //   description: product.description,
//     //   price: product.price,
//     //   image: firstImageUrl,
//     // };

//     // generate QR code as DataURL
//     //const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
    

//     const uploadResponse = await cloudinary.uploader.upload(qrDataUrlFormatted, {
//       folder: "qrcodes",
//     });
   
//     // save only the secure_url (string) in qrCode field
//     await product.update({ qrCode: uploadResponse.secure_url }, { transaction: t });

//     await t.commit();
//     return await Product.findByPk(product.id, { include: ["images"] });
//   } catch (error) {
//     await t.rollback();
//     throw error;
//   }
// }

//   async getAllProducts() {
//     return await Product.findAll({
//       include: [
//       { model: Brand, as: "brand", required: false },       // nullable
//       { model: SubCategory, as: "subcategory", required: false }, 
//       { model: Category, as: "category", required: false },       
//       { model: Store, as: "store", required: false },       // nullable
//       { model: ProductImage, as: "images", required: false } // optional
//     ]
//     });
//   }

// async getProductById(id) {
//   return await Product.findByPk(id, {
//     include: [
//       { model: Brand, as: "brand", required: false },
//       { model: SubCategory, as: "subcategory" ,  required: true},
//       { model: Store, as: "store" ,  required: false},
//       { model: ProductImage, as: "images", required: false },      
      
//     ],
//   });
// }


//     async updateProduct(id, updates, files) {
//   // Handle images if files are uploaded
//   if (files && files.length > 0) {
//     updates.productImages = files.map(file => ({
//       url: file.path,
//       public_id: file.filename
//     }));
//   }

//   // Ensure storeId is nullable if not provided
//   if (!updates.storeId) updates.storeId = null;

//   // 1. Find the product
//   const product = await Product.findByPk(id);
//   if (!product) throw new Error("Product not found");

//   // 2. Update product
//   await product.update(updates);

//   // (Optional) if you have a ProductImage model and relation, handle saving separately
//   // e.g. if (updates.productImages) await ProductImage.bulkCreate([...])

//   // 3. Reload with associations
//   const updatedProduct = await Product.findByPk(id, {
//     include: [
//       { model: Brand, as: "brand", required: false },
//       { model: SubCategory, as: "subcategory", required: true },
//       { model: Store, as: "store", required: false },
//       { model: ProductImage, as: "images", required: false },
//     ],
//   });

//   return updatedProduct;
// }


//  async deleteProduct(id) {
//   // 1. Find product with its images
//   const product = await Product.findByPk(id, {
//     include: [{ model: ProductImage, as: "images" }],
//   });

//   if (!product) {
//     throw new Error("Product not found");
//   }

//   // 2. Delete images from Cloudinary & DB
//   if (product.images && product.images.length > 0) {
//     for (const img of product.images) {
//       try {
//         await cloudinary.uploader.destroy(img.public_id); // remove from Cloudinary
//         await img.destroy(); // remove from DB
//       } catch (err) {
//         console.error("Error deleting image:", err.message);
//       }
//     }
//   }

//   // 3. Delete product itself
//   await product.destroy();

//   return { message: "Product and related images deleted successfully" };
// }

// }

// module.exports = new ProductServices();


const { sequelize, Product, ProductImage, Inventory } = require("../models");
const QRCode = require("qrcode");
const cloudinary = require("../config/cloudinary");

class ProductService {

  async createProduct(data, files) {
    const t = await sequelize.transaction();

    try {
      // ── 1. Create product ──────────────────────
      const product = await Product.create({
        name:                data.name,
        description:         data.description,
        price:               data.price,
        stockQuantity:       data.stockQuantity ?? 0,
        categoryId:          data.categoryId,
        subCategoryId:       data.subCategoryId,
        storeId:             data.storeId || null,
        brandId:             data.brandId || null,
        weightKg:            data.weightKg ?? 0,
        lengthCm:            data.lengthCm || null,
        widthCm:             data.widthCm  || null,
        heightCm:            data.heightCm || null,
        logisticsCategoryId: data.logisticsCategoryId || null,
        pickupStationId:     data.pickupStationId || null,
      }, { transaction: t });

      // ── 2. Create inventory record ─────────────
      // Always created alongside the product.
      // stockQuantity drives the opening balance;
      // lowStockThreshold defaults to 10 but is overridable.
      await Inventory.create({
        productId:         product.id,
        storeId:           data.storeId || null,
        quantityOnHand:    data.stockQuantity ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 10,
      }, { transaction: t });

      // ── 3. Upload images (if any) ──────────────
      if (files && files.length > 0) {
        const uploadPromises = files.map(file =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        );
        const uploaded = await Promise.all(uploadPromises);

        await Promise.all(uploaded.map(result =>
          ProductImage.create({
            productId: product.id,
            url:       result.secure_url,
          }, { transaction: t })
        ));
      }

      
      const productUrl = `${process.env.FRONTEND_URL}/products/${product.id}`;
      const qrDataUrl = await QRCode.toDataURL(productUrl);

      const uploadResponse = await cloudinary.uploader.upload(qrDataUrl, {
        folder: "qrcodes",
      });

      await product.update(
        { qrCode: uploadResponse.secure_url },
        { transaction: t }
      );

      await t.commit();
      // Return full product with images
      return Product.findByPk(product.id, {
        include: [{ model: ProductImage, as: "images", attributes: ["url"] }],
      });

    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async updateProduct(id, data, files) {
    const t = await sequelize.transaction();

    try {
      const product = await Product.findOne({
        where: { id, isDeleted: false },
        transaction: t,
      });
      if (!product) return null;

      await product.update(data, { transaction: t });

      // If stockQuantity is being corrected by an admin, sync inventory too
      if (data.stockQuantity !== undefined) {
        await Inventory.update(
          { quantityOnHand: data.stockQuantity },
          { where: { productId: id }, transaction: t }
        );
      }

      if (files && files.length > 0) {
        const uploadPromises = files.map(file =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        );
        const uploaded = await Promise.all(uploadPromises);
        await Promise.all(uploaded.map(result =>
          ProductImage.create({
            productId: product.id,
            url:       result.secure_url,
          }, { transaction: t })
        ));
      }

      await t.commit();
      return Product.findByPk(id, {
        include: [{ model: ProductImage, as: "images", attributes: ["url"] }],
      });

    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async getAllProducts() {
    return Product.findAll({
      where: { isDeleted: false },
      include: [{ model: ProductImage, as: "images", attributes: ["url"] }],
      order: [["createdAt", "DESC"]],
    });
  }

  async getProductById(id) {
    return Product.findOne({
      where: { id, isDeleted: false },
      include: [{ model: ProductImage, as: "images", attributes: ["url"] }],
    });
  }

  async deleteProduct(id) {
    const product = await Product.findOne({ where: { id, isDeleted: false } });
    if (!product) return null;
    // Soft delete both product and its inventory record
    await product.update({ isDeleted: true });
    await Inventory.update({ isDeleted: true }, { where: { productId: id } });
    return product;
  }
}

module.exports = new ProductService();