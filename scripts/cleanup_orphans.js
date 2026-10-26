const { sequelize, Product, Store, Category, SubCategory, Brand } = require("../models");
const { Op } = require("sequelize");

async function cleanupOrphans() {
  console.log("🚀 Starting Orphan Data Cleanup Analysis...");
  console.log("--------------------------------------------------");

  try {
    // 1. Find products with invalid storeId
    const allStores = await Store.findAll({ attributes: ['id'] });
    const storeIds = allStores.map(s => s.id);
    const productsWithInvalidStore = await Product.findAll({
      where: {
        storeId: {
          [Op.notIn]: storeIds
        }
      },
      attributes: ['id', 'name', 'storeId']
    });

    console.log(`\n📦 Store Orphans: Found ${productsWithInvalidStore.length} products`);
    productsWithInvalidStore.forEach(p => {
      console.log(`- Product: ${p.name} (ID: ${p.id}) points to missing Store ID: ${p.storeId}`);
    });

    // 2. Find products with invalid categoryId
    const allCategories = await Category.findAll({ attributes: ['id'] });
    const categoryIds = allCategories.map(c => c.id);
    const productsWithInvalidCategory = await Product.findAll({
      where: {
        categoryId: {
          [Op.notIn]: categoryIds
        }
      },
      attributes: ['id', 'name', 'categoryId']
    });

    console.log(`\n📁 Category Orphans: Found ${productsWithInvalidCategory.length} products`);
    productsWithInvalidCategory.forEach(p => {
      console.log(`- Product: ${p.name} (ID: ${p.id}) points to missing Category ID: ${p.categoryId}`);
    });

    // 3. Find products with invalid subCategoryId
    const allSubCats = await SubCategory.findAll({ attributes: ['id'] });
    const subCatIds = allSubCats.map(s => s.id);
    const productsWithInvalidSubCat = await Product.findAll({
      where: {
        subCategoryId: {
          [Op.notIn]: subCatIds
        }
      },
      attributes: ['id', 'name', 'subCategoryId']
    });

    console.log(`\n📂 Sub-Category Orphans: Found ${productsWithInvalidSubCat.length} products`);
    productsWithInvalidSubCat.forEach(p => {
      console.log(`- Product: ${p.name} (ID: ${p.id}) points to missing Sub-Category ID: ${p.subCategoryId}`);
    });

    // 4. Find products with invalid brandId
    const allBrands = await Brand.findAll({ attributes: ['id'] });
    const brandIds = allBrands.map(b => b.id);
    const productsWithInvalidBrand = await Product.findAll({
      where: {
        brandId: {
          [Op.notIn]: brandIds
        }
      },
      attributes: ['id', 'name', 'brandId']
    });

    console.log(`\n🏷️ Brand Orphans: Found ${productsWithInvalidBrand.length} products`);
    productsWithInvalidBrand.forEach(p => {
      console.log(`- Product: ${p.name} (ID: ${p.id}) points to missing Brand ID: ${p.brandId}`);
    });

    console.log("\n--------------------------------------------------");
    console.log("✅ Analysis Complete.");
    console.log("To fix these, you can manually update the records or implement a 'SET NULL' logic in this script.");

  } catch (error) {
    console.error("❌ Error during cleanup analysis:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

cleanupOrphans();
