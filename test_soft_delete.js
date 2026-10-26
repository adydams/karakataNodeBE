const { sequelize, Store, Product, User, Category, SubCategory } = require("./models");
const storeService = require("./services/storeServices");

async function testSoftDelete() {
  console.log("🧪 Testing Soft-Delete Logic...");

  try {
    const userId = "144f6b6b-8a7d-11f1-95fc-16895825595c";

    // 1. Setup: Create a real category
    console.log("\n--- Step 1: Creating Category ---");
    const category = await Category.create({
      name: `Test Category ${Date.now()}`,
      description: "Test Category Description"
    });
    console.log(`Category created: ${category.id}`);

    // 2. Setup: Create a real sub-category
    console.log("\n--- Step 2: Creating Sub-Category ---");
    const subCategory = await SubCategory.create({
      name: `Test Sub Category ${Date.now()}`,
      description: "Test Sub Category Description",
      categoryId: category.id
    });
    console.log(`Sub-Category created: ${subCategory.id}`);

    // 3. Create Store
    console.log("\n--- Step 3: Creating Store ---");
    const store = await Store.create({
      name: `Test SoftDelete Store ${Date.now()}`,
      ownerUserId: userId,
      address: "Test Address",
      isDeleted: false
    });
    console.log(`Store created: ${store.id}`);

    // 4. Create Product
    console.log("\n--- Step 4: Creating Product ---");
    const product = await Product.create({
      name: `Test Product ${Date.now()}`,
      price: 100,
      storeId: store.id,
      categoryId: category.id,
      subCategoryId: subCategory.id,
      isDeleted: false,
      status: "approved"
    });
    console.log(`Product created: ${product.id}`);

    // 5. Delete Store
    console.log("\n--- Step 5: Deleting Store ---");
    await storeService.deleteStore(store.id);
    console.log("Store deletion triggered.");

    // 6. Verify Soft-Delete
    console.log("\n--- Step 6: Verifying Soft-Delete ---");
    const deletedStore = await Store.findByPk(store.id);
    console.log(`Store isDeleted: ${deletedStore.isDeleted}`);

    const deletedProduct = await Product.findByPk(product.id);
    console.log(`Product isDeleted: ${deletedProduct.isDeleted}`);

    // 7. Verify API Filtering
    console.log("\n--- Step 7: Verifying API Filtering ---");
    const allStores = await storeService.getAllStores();
    const foundStore = allStores.find(s => s.id === store.id);
    console.log(`Store found in getAllStores: ${!!foundStore}`);

    const storeById = await storeService.getStoreById(store.id);
    console.log(`Store found in getStoreById: ${!!storeById}`);

    if (deletedStore.isDeleted && deletedProduct.isDeleted && !foundStore && !storeById) {
      console.log("\n✅ SUCCESS: Soft-delete logic works as expected!");
    } else {
      console.log("\n❌ FAILURE: Soft-delete logic failed one or more checks.");
    }

  } catch (error) {
    console.error("\n❌ TEST ERROR:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

testSoftDelete();
