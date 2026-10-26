const {
  User,
  Store,
  StorePickupStation,
  Product,
  Category,
  SubCategory,
  Inventory,
  SystemSetting,
  Wallet,
  Role,
  Permission
} = require("../models");
const bcrypt = require("bcryptjs");

async function seedMarketplace() {
  try {
    console.log("🌱 Seeding Marketplace Data...");

    // 1. System Settings
    await SystemSetting.destroy({ where: {} });
    await SystemSetting.create({
      businessModel: "MARKETPLACE",
      defaultCommissionRate: 8.00,
      shippingMarkupPercent: 2.00,
      returnWindowDays: 5,
      payoutDelayDays: 7,
      minimumPayoutAmount: 1000.00,
      vatPercentage: 4.56,
      internalBaseFee: 1000.00,
      internalPricePerKm: 100.00,
      internalPricePerKg: 50.00,
      pickupFeePercent: 60.00,
    });

    // 2. Users
    const hashedPassword = await bcrypt.hash("Password123!", bcrypt.genSalt(10));

    const superAdmin = await User.create({
      name: "Super Admin",
      email: "superadmin@karakata.com",
      phone: "+2348000000001",
      password: hashedPassword,
      roleId: (await Role.findOne({ where: { role: 'SuperAdmin' } }))?.id,
    });

    const storeOwner = await User.create({
      name: "Store Owner",
      email: "storeowner@karakata.com",
      phone: "+2348000000002",
      password: hashedPassword,
      roleId: (await Role.findOne({ where: { role: 'StoreAdmin' } }))?.id,
    });

    const customer = await User.create({
      name: "John Customer",
      email: "customer@karakata.com",
      phone: "+2348000000003",
      password: hashedPassword,
      roleId: (await Role.findOne({ where: { role: 'Customer' } }))?.id,
    });

    // 3. Store
    const store = await Store.create({
      name: "Gadget Haven",
      email: "contact@gadgethaven.com",
      phone: "+2348000000004",
      address: "123 Tech Street, Lagos",
      ownerUserId: storeOwner.id,
      commissionRate: 5.00, // Custom override
      returnWindowDays: 3,   // Custom override
      payoutAccountNumber: "0123456789",
      payoutBankCode: "058",
      payoutAccountName: "Gadget Haven Ltd",
    });

    // 4. Pickup Stations
    const stationLagos = await StorePickupStation.create({
      storeId: store.id,
      name: "Lagos Central Hub",
      address: "456 Lagos Hub, Lagos, Nigeria",
      shipbubbleAddressCode: 1001,
      isDefault: true,
    });

    const stationAbuja = await StorePickupStation.create({
      storeId: store.id,
      name: "Abuja North Station",
      address: "789 Abuja Road, Abuja, Nigeria",
      shipbubbleAddressCode: 2001,
      isDefault: false,
    });

    // 5. Product
    const category = await Category.findOne({ where: { name: 'Electronics' } })
                   || await Category.create({ name: 'Electronics' });
    const subCategory = await SubCategory.findOne({ where: { name: 'Phones' } })
                      || await SubCategory.create({ name: 'Phones', categoryId: category.id });

    const phone = await Product.create({
      name: "Karakata Phone X",
      description: "Premium smartphone for testing",
      price: 100000,
      stockQuantity: 15, // Read cache
      categoryId: category.id,
      subCategoryId: subCategory.id,
      storeId: store.id,
      weightKg: 0.5,
      lengthCm: 15,
      widthCm: 7,
      heightCm: 1,
    });

    // 6. Inventory (Distributed)
    // Station Lagos has 10 units
    await Inventory.create({
      productId: phone.id,
      pickupStationId: stationLagos.id,
      quantityOnHand: 10,
      quantityReserved: 0,
    });

    // Station Abuja has 5 units
    await Inventory.create({
      productId: phone.id,
      pickupStationId: stationAbuja.id,
      quantityOnHand: 5,
      quantityReserved: 0,
    });

    // 7. Wallet
    await Wallet.create({
      storeId: store.id,
      availableBalance: 0,
      pendingBalance: 0,
      lifetimeEarnings: 0,
    });

    console.log("✅ Marketplace seeded successfully!");
    console.log(`- SuperAdmin: ${superAdmin.email}`);
    console.log(`- StoreOwner: ${storeOwner.email}`);
    console.log(`- Customer: ${customer.email}`);
    console.log(`- Product: ${phone.name} (ID: ${phone.id})`);
    console.log(`- Lagos Station: ${stationLagos.id}`);
    console.log(`- Abuja Station: ${stationAbuja.id}`);

  } catch (error) {
    console.error("❌ Seeding error:", error);
  }
}

module.exports = seedMarketplace;
