const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../db/database');
const { User, Store, Category, SubCategory, Product, ProductImage, Inventory, Role, StorePickupStation } = require('../models/index');

const adminProfiles = [
  { name: 'Aisha Bello', email: 'aisha.bello@karakata.com', phone: '+2348010000001' },
  { name: 'Chinedu Okafor', email: 'chinedu.okafor@karakata.com', phone: '+2348010000002' },
  { name: 'Fatima Yusuf', email: 'fatima.yusuf@karakata.com', phone: '+2348010000003' },
  { name: 'David Mensah', email: 'david.mensah@karakata.com', phone: '+233240000004' },
  { name: 'Ngozi Eze', email: 'ngozi.eze@karakata.com', phone: '+2348010000005' },
  { name: 'Umar Musa', email: 'umar.musa@karakata.com', phone: '+2348010000006' },
  { name: 'Grace Amadi', email: 'grace.amadi@karakata.com', phone: '+2348010000007' },
  { name: 'Ken Obi', email: 'ken.obi@karakata.com', phone: '+2348010000008' },
  { name: 'Rashida Ahmed', email: 'rashida.ahmed@karakata.com', phone: '+2348010000009' },
  { name: 'Michael Ade', email: 'michael.ade@karakata.com', phone: '+2348010000010' }
];

const storeTemplates = [
  {
    name: 'Karakata Electronics Hub',
    address: '24 Victoria Island, Lagos, Nigeria',
    email: 'electronics@karakata.com',
    description: 'Premium consumer electronics store offering smartphones, laptops, audio devices, and smart home gadgets.',
  },
  {
    name: 'Karakata Fashion House',
    address: '7 Lekki Phase 1, Lagos, Nigeria',
    email: 'fashion@karakata.com',
    description: 'Curated fashion and lifestyle store for apparel, footwear, and accessories.',
  },
  {
    name: 'Karakata Home & Living',
    address: '18 Maitama, Abuja, Nigeria',
    email: 'home@karakata.com',
    description: 'Home décor, kitchen appliances, and daily living essentials for modern households.',
  },
  {
    name: 'Karakata Health Pharmacy',
    address: '3 Airport Road, Accra, Ghana',
    email: 'health@karakata.com',
    description: 'Trusted pharmaceutical and wellness store stocked with medicines, vitamins, and personal care supplies.',
  },
  {
    name: 'Karakata Sports & Outdoors',
    address: '12 Victoria Avenue, Ibadan, Nigeria',
    email: 'sports@karakata.com',
    description: 'Sports gear, outdoor equipment, and fitness essentials for active lifestyles.',
  },
  {
    name: 'Karakata Office Supplies',
    address: '48 Adetokunbo Ademola Street, Ikeja, Nigeria',
    email: 'office@karakata.com',
    description: 'Office stationery, school supplies, and productivity essentials for home and business.',
  },
  {
    name: 'Karakata Tools & Construction',
    address: '5 Industrial Avenue, Port Harcourt, Nigeria',
    email: 'tools@karakata.com',
    description: 'Professional power tools, hand tools, and construction materials for builders and contractors.',
  },
  {
    name: 'Karakata Auto Care',
    address: '89 Lekki-Epe Expressway, Lagos, Nigeria',
    email: 'auto@karakata.com',
    description: 'Automotive parts, accessories, and care products designed for roadworthy vehicles.',
  },
  {
    name: 'Karakata Books & Media',
    address: '22 Freedom Road, Jos, Nigeria',
    email: 'books@karakata.com',
    description: 'Books, educationalmedia, and entertainment collections for every age group.',
  },
  {
    name: 'Karakata Pet & Garden',
    address: '61 Ahmadu Bello Way, Kaduna, Nigeria',
    email: 'petgarden@karakata.com',
    description: 'Pet supplies, garden tools, and lifestyle accessories for pets and outdoor spaces.',
  }
];

const pickupStationTemplates = [
  { name: 'Main Store Pickup Point', contactPerson: 'Store Manager' }
];

const modelSuffixes = [
  'Pro', 'Prime', 'Elite', 'Max', 'Plus', 'X', 'One', 'Ultra', 'Advance', 'Spark'
];

const adjectives = [
  'Premium', 'Essential', 'Professional', 'Classic', 'Dynamic', 'Smart', 'Comfort', 'Urban', 'Eco', 'Advanced'
];

const fallbackProductWords = [
  'Edition', 'Series', 'Model', 'Pack', 'Set', 'System', 'Device', 'Kit'
];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choose = (items) => items[Math.floor(Math.random() * items.length)];

const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const getPriceRange = (categoryName, subCategoryName) => {
  const category = categoryName.toLowerCase();
  if (category.includes('electronics')) {
    if (/phone|smartphone|mobile/i.test(subCategoryName)) return [220, 1200];
    if (/laptop|notebook/i.test(subCategoryName)) return [450, 2500];
    if (/headphone|speaker|earbud|audio/i.test(subCategoryName)) return [35, 400];
    if (/camera|drone/i.test(subCategoryName)) return [130, 1800];
    return [45, 700];
  }
  if (category.includes('fashion') || category.includes('clothing')) {
    if (/watch/i.test(subCategoryName)) return [50, 550];
    if (/shoes|boots|sandals/i.test(subCategoryName)) return [25, 210];
    return [12, 120];
  }
  if (category.includes('home')) return [8, 650];
  if (category.includes('beauty')) return [4, 95];
  if (category.includes('sports')) return [9, 450];
  if (category.includes('book') || category.includes('media')) return [6, 45];
  if (category.includes('toy')) return [5, 120];
  if (category.includes('pet')) return [7, 170];
  if (category.includes('automotive')) return [10, 480];
  if (category.includes('office')) return [4, 150];
  if (category.includes('pharmacy') || category.includes('health')) return [3, 95];
  if (category.includes('power') || category.includes('tool')) return [15, 1200];
  if (category.includes('plumbing') || category.includes('electrical') || category.includes('construction')) return [12, 920];
  return [8, 180];
};

const getWeight = (categoryName, subCategoryName) => {
  const category = categoryName.toLowerCase();
  if (category.includes('electronics')) {
    if (/phone|smartphone/i.test(subCategoryName)) return (randomBetween(130, 220) / 1000).toFixed(3);
    if (/laptop/i.test(subCategoryName)) return (randomBetween(1200, 2500) / 1000).toFixed(3);
    if (/headphone|speaker/i.test(subCategoryName)) return (randomBetween(200, 700) / 1000).toFixed(3);
    return (randomBetween(300, 2000) / 1000).toFixed(3);
  }
  if (category.includes('fashion') || category.includes('clothing')) return (randomBetween(150, 850) / 1000).toFixed(3);
  if (category.includes('home')) return (randomBetween(200, 3200) / 1000).toFixed(3);
  if (category.includes('beauty')) return (randomBetween(60, 450) / 1000).toFixed(3);
  if (category.includes('sports')) return (randomBetween(200, 3200) / 1000).toFixed(3);
  if (category.includes('book') || category.includes('media')) return (randomBetween(350, 950) / 1000).toFixed(3);
  if (category.includes('pet')) return (randomBetween(200, 2800) / 1000).toFixed(3);
  if (category.includes('automotive')) return (randomBetween(800, 6000) / 1000).toFixed(3);
  return (randomBetween(200, 2400) / 1000).toFixed(3);
};

const getDimensions = (categoryName, subCategoryName) => {
  const category = categoryName.toLowerCase();
  if (category.includes('electronics')) return {
    lengthCm: randomBetween(10, 35),
    widthCm: randomBetween(8, 25),
    heightCm: randomBetween(1, 12)
  };
  if (category.includes('book') || category.includes('media')) return { lengthCm: 21, widthCm: 14, heightCm: randomBetween(1, 4) };
  if (category.includes('fashion')) return { lengthCm: randomBetween(10, 40), widthCm: randomBetween(8, 32), heightCm: randomBetween(2, 20) };
  return { lengthCm: randomBetween(8, 60), widthCm: randomBetween(8, 50), heightCm: randomBetween(2, 25) };
};

const generateProductDetails = (categoryName, subCategoryName, storeName) => {
  const adjective = choose(adjectives);
  const suffix = choose(modelSuffixes);
  const fallback = choose(fallbackProductWords);
  const normalizedSub = subCategoryName.replace(/&/g, 'and');
  const nameBase = /phone|smartphone|mobile/i.test(subCategoryName)
    ? 'Smartphone'
    : /laptop|notebook/i.test(subCategoryName)
    ? 'Laptop'
    : /headphone|speaker|earbud/i.test(subCategoryName)
    ? 'Headphones'
    : /watch/i.test(subCategoryName)
    ? 'Wrist Watch'
    : /bag|backpack/i.test(subCategoryName)
    ? 'Backpack'
    : /camera/i.test(subCategoryName)
    ? 'Camera'
    : /toy|game/i.test(subCategoryName)
    ? 'Play Set'
    : normalizedSub;

  const productName = `${adjective} ${nameBase} ${suffix}`;
  const [minPrice, maxPrice] = getPriceRange(categoryName, subCategoryName);
  const price = (Math.round((Math.max(minPrice, Math.min(maxPrice, minPrice + Math.random() * (maxPrice - minPrice))) * 100)) / 100).toFixed(2);
  const stockQuantity = randomBetween(12, 180);
  const weightKg = parseFloat(getWeight(categoryName, subCategoryName));
  const dimensions = getDimensions(categoryName, subCategoryName);

  const description = `The ${productName} from ${storeName} is designed for ${categoryName.toLowerCase()} shoppers who need reliable, high-quality ${subCategoryName.toLowerCase()}. It comes with robust performance, smart design, and great value.`;

  return {
    name: productName,
    description,
    price,
    stockQuantity,
    weightKg,
    lengthCm: dimensions.lengthCm,
    widthCm: dimensions.widthCm,
    heightCm: dimensions.heightCm,
  };
};

const buildImageUrl = (productName) => {
  const slug = normalizeName(productName);
  return `https://picsum.photos/seed/${slug}/640/480`;
};

const run = async () => {
  try {
    await sequelize.sync();

    const [adminRole] = await Role.findOrCreate({
      where: { name: 'Admin' },
      defaults: {
        description: 'Administrator with access to manage stores and products.'
      }
    });

    const admins = [];
    for (const profile of adminProfiles) {
      const [user, created] = await User.findOrCreate({
        where: { email: profile.email },
        defaults: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          passwordHash: await bcrypt.hash('Admin@123', 10),
          isActive: true,
          isEmailVerified: true,
          roleId: adminRole.id,
        }
      });

      if (!created && user.roleId !== adminRole.id) {
        user.roleId = adminRole.id;
        await user.save();
      }
      admins.push(user);
    }

    const stores = [];
    for (let i = 0; i < storeTemplates.length; i += 1) {
      const template = storeTemplates[i];
      const owner = admins[i];
      const [store] = await Store.findOrCreate({
        where: { name: template.name },
        defaults: {
          ownerUserId: owner.id,
          createdBy: owner.id,
          name: template.name,
          address: template.address,
          phone: owner.phone,
          email: template.email,
          description: template.description,
        }
      });

      if (!store.ownerUserId || store.ownerUserId !== owner.id) {
        store.ownerUserId = owner.id;
        store.createdBy = owner.id;
        store.address = template.address;
        store.phone = owner.phone;
        store.email = template.email;
        store.description = template.description;
        await store.save();
      }

      stores.push(store);

      await StorePickupStation.findOrCreate({
        where: { storeId: store.id, name: pickupStationTemplates[0].name },
        defaults: {
          storeId: store.id,
          name: pickupStationTemplates[0].name,
          address: store.address,
          phone: store.phone,
          contactPerson: `${pickupStationTemplates[0].contactPerson} - ${owner.name}`,
          isDefault: true,
        }
      });
    }

    const categories = await Category.findAll({
      where: { isDeleted: false },
      include: [{ model: SubCategory, as: 'subcategories', where: { isDeleted: false }, required: false }]
    });

    let createdProducts = 0;
    let createdImages = 0;
    let createdInventories = 0;

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      const category = categories[categoryIndex];
      const store = stores[categoryIndex % stores.length];
      const subcategories = category.subcategories || [];

      for (const subCategory of subcategories) {
        const productDetails = generateProductDetails(category.name, subCategory.name, store.name);
        const productName = `${productDetails.name} (${subCategory.name})`;

        const productExists = await Product.findOne({
          where: {
            name: productName,
            categoryId: category.id,
            subCategoryId: subCategory.id,
            storeId: store.id,
          }
        });

        if (productExists) continue;

        const product = await Product.create({
          ...productDetails,
          name: productName,
          categoryId: category.id,
          subCategoryId: subCategory.id,
          storeId: store.id,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(productName)}&size=150x150`,
          logisticsCategoryId: randomBetween(1, 5),
        });

        await ProductImage.create({
          productId: product.id,
          url: buildImageUrl(productName),
          public_id: `product_${normalizeName(productName)}`,
        });

        await Inventory.create({
          productId: product.id,
          storeId: store.id,
          quantityOnHand: productDetails.stockQuantity,
          lowStockThreshold: randomBetween(5, 15),
        });

        createdProducts += 1;
        createdImages += 1;
        createdInventories += 1;
      }
    }

    console.log(`\n✅ Seed complete:`);
    console.log(`  - Admin users created/verified: ${admins.length}`);
    console.log(`  - Stores created/verified: ${stores.length}`);
    console.log(`  - Products created: ${createdProducts}`);
    console.log(`  - Product images created: ${createdImages}`);
    console.log(`  - Inventory records created: ${createdInventories}\n`);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
