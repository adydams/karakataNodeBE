const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize, Product, Inventory } = require('../models');
const User = require('../models/userModel');
const Store = require('../models/storeModel');
const StorePickupStation = require('../models/StorePickupStation');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel');
const Notification = require('../models/notificationModels');

// Seeder: creates a user -> store -> pickup stations -> product -> inventory -> notifications
// Ensures parents exist before children to avoid orphan data.

const seedStorePickupProductNotifications = async () => {
  const t = await sequelize.transaction();
  try {
    // 1) Category & SubCategory (required by Product)
    const [category] = await Category.findOrCreate({
      where: { name: 'Seeded Store Category' },
      defaults: {
        id: crypto.randomUUID(),
        name: 'Seeded Store Category',
        description: 'Category created by seeder for store/sample products',
      },
      transaction: t,
    });

    const [subcategory] = await SubCategory.findOrCreate({
      where: { name: 'Seeded Subcategory' },
      defaults: {
        id: crypto.randomUUID(),
        name: 'Seeded Subcategory',
        categoryId: category.id,
      },
      transaction: t,
    });

    // 2) User (store owner)
    const passwordHash = await bcrypt.hash('SeedPass123!', 10);
    const [ownerUser] = await User.findOrCreate({
      where: { email: 'seed.store.owner@example.com' },
      defaults: {
        id: crypto.randomUUID(),
        name: 'Seed Store Owner',
        email: 'seed.store.owner@example.com',
        phone: '+00000000000',
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
      transaction: t,
    });

    // 3) Store
    const [store] = await Store.findOrCreate({
      where: { name: 'Seeded Store' },
      defaults: {
        id: crypto.randomUUID(),
        ownerUserId: ownerUser.id,
        createdBy: ownerUser.id,
        name: 'Seeded Store',
        address: '123 Seeder Lane',
        phone: '+00000000000',
        email: 'store@example.com',
        description: 'Store created by seeder for integration testing',
      },
      transaction: t,
    });

    // 4) Pickup stations (2)
    const [ps1] = await StorePickupStation.findOrCreate({
      where: { name: 'Seeded Pickup Station A', storeId: store.id },
      defaults: {
        id: crypto.randomUUID(),
        storeId: store.id,
        name: 'Seeded Pickup Station A',
        address: 'Corner of Seed & Main',
        phone: '+00000000001',
        contactPerson: 'Alice Seeder',
        isDefault: true,
      },
      transaction: t,
    });

    const [ps2] = await StorePickupStation.findOrCreate({
      where: { name: 'Seeded Pickup Station B', storeId: store.id },
      defaults: {
        id: crypto.randomUUID(),
        storeId: store.id,
        name: 'Seeded Pickup Station B',
        address: '456 Seeder Avenue',
        phone: '+00000000002',
        contactPerson: 'Bob Seeder',
        isDefault: false,
      },
      transaction: t,
    });

    // 5) Product
    const [product] = await Product.findOrCreate({
      where: { name: 'Seeded Sample Product', storeId: store.id },
      defaults: {
        id: crypto.randomUUID(),
        name: 'Seeded Sample Product',
        description: 'A sample product inserted by seeder',
        price: 1999.99,
        stockQuantity: 25,
        categoryId: category.id,
        subCategoryId: subcategory.id,
        storeId: store.id,
        brandId: null,
        weightKg: 0.5,
        lengthCm: 10,
        widthCm: 5,
        heightCm: 2,
        logisticsCategoryId: null,
        qrCode: null,
      },
      transaction: t,
    });

    // 6) Inventory for product at store
    // Use raw SQL to insert inventory including pickupStationId to satisfy DB constraints
    const [existingInventory] = await sequelize.query(
      'SELECT id FROM inventories WHERE productId = ? AND storeId = ? LIMIT 1',
      { replacements: [product.id, store.id], transaction: t }
    );

    if (!existingInventory || existingInventory.length === 0) {
      await sequelize.query(
        'INSERT INTO inventories (`id`, `productId`, `storeId`, `pickupStationId`, `quantityOnHand`, `lowStockThreshold`, `isDeleted`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        { replacements: [crypto.randomUUID(), product.id, store.id, ps1.id, 25, 5, false], transaction: t }
      );
    }

    // 7) Link product to pickup stations (many-to-many)
    // setPickupStations is available from associations in models/index.js
    // Use raw association method with transaction
    // Insert into product_pickup_stations in a way that tolerates different schemas
    const insertJoin = async (pId, sId) => {
      // Try inserting with an explicit id column first (for schemas that have it)
      try {
        await sequelize.query(
          'INSERT INTO product_pickup_stations (`id`, `productId`, `pickupStationId`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          { replacements: [crypto.randomUUID(), pId, sId], transaction: t }
        );
      } catch (err) {
        // If 'id' doesn't exist, fall back to inserting without it
        await sequelize.query(
          'INSERT INTO product_pickup_stations (`productId`, `pickupStationId`, `createdAt`, `updatedAt`) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          { replacements: [pId, sId], transaction: t }
        );
      }
    };

    await insertJoin(product.id, ps1.id);
    await insertJoin(product.id, ps2.id);

    // 8) Notifications for the owner user (one general, one low-stock if threshold close)
    await Notification.create({
      id: crypto.randomUUID(),
      userId: ownerUser.id,
      type: 'GENERAL',
      title: 'Welcome — Store seeded',
      message: `Your seeded store "${store.name}" and sample product "${product.name}" were created.`,
      metadata: { storeId: store.id, productId: product.id },
      isRead: false,
    }, { transaction: t });

    await Notification.create({
      id: crypto.randomUUID(),
      userId: ownerUser.id,
      type: 'LOW_STOCK',
      title: 'Low stock (sample product)',
      message: `Product "${product.name}" has ${product.stockQuantity} units — below threshold of 5?`,
      metadata: { productId: product.id },
      isRead: false,
    }, { transaction: t });

    await t.commit();

    // Return a concise summary
    return {
      user: { id: ownerUser.id, email: ownerUser.email },
      store: { id: store.id, name: store.name },
      pickupStations: [ { id: ps1.id, name: ps1.name }, { id: ps2.id, name: ps2.name } ],
      product: { id: product.id, name: product.name },
    };
  } catch (err) {
    await t.rollback();
    console.error('Seeding failed:', err);
    throw err;
  }
};

module.exports = seedStorePickupProductNotifications;
