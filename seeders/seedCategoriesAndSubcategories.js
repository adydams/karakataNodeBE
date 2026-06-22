const sequelize = require('../db/database');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/subCategoryModel');

// Comprehensive categories and subcategories data
const categoriesData = [
  // ===== E-COMMERCE PRODUCTS (Main Categories) =====
  {
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    subCategories: [
      'Smartphones', 'Tablets', 'Laptops', 'Desktops', 'Smartwatches', 'Headphones',
      'Speakers', 'Cameras', 'Drones', 'Gaming Consoles', 'Printers', 'Routers',
      'Monitor', 'Keyboards', 'Mouse', 'USB Cables', 'Phone Chargers', 'Power Banks'
    ]
  },
  {
    name: 'Clothing & Fashion',
    description: 'Apparel and fashion accessories',
    subCategories: [
      'Men Shirts', 'Men Pants', 'Men Jackets', 'Women Dresses', 'Women Tops',
      'Women Pants', 'Shoes & Sneakers', 'Boots', 'Sandals', 'Belts', 'Scarves',
      'Hats & Caps', 'Gloves', 'Sunglasses', 'Watches', 'Jewelry', 'Handbags',
      'Backpacks', 'Socks', 'Undergarments', 'Swimwear', 'Activewear', 'Formal Wear'
    ]
  },
  {
    name: 'Home & Kitchen',
    description: 'Home and kitchen appliances',
    subCategories: [
      'Cookware Sets', 'Knives', 'Utensils', 'Pans & Pots', 'Baking Pans', 'Mixing Bowls',
      'Cutting Boards', 'Measuring Cups', 'Coffee Makers', 'Toasters', 'Blenders',
      'Microwave Ovens', 'Refrigerators', 'Washing Machines', 'Vacuum Cleaners',
      'Dishwashers', 'Air Purifiers', 'Humidifiers', 'Fans', 'Heaters', 'Lighting',
      'Furniture', 'Bedding', 'Curtains', 'Rugs', 'Pillows', 'Blankets'
    ]
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Beauty products and personal care items',
    subCategories: [
      'Face Care', 'Body Care', 'Hair Care', 'Nail Care', 'Skincare Serums',
      'Moisturizers', 'Cleansers', 'Masks', 'Sunscreen', 'Makeup Foundation',
      'Concealer', 'Blush', 'Eyeshadow', 'Lipstick', 'Mascara', 'Eyeliner',
      'Brushes', 'Perfumes', 'Deodorants', 'Shampoo', 'Conditioner', 'Hair Oil',
      'Razors', 'Shaving Cream', 'Aftershave', 'Toothpaste', 'Mouthwash'
    ]
  },
  {
    name: 'Sports & Outdoors',
    description: 'Sports equipment and outdoor gear',
    subCategories: [
      'Running Shoes', 'Basketball Shoes', 'Tennis Shoes', 'Yoga Mats', 'Dumbbells',
      'Barbells', 'Resistance Bands', 'Treadmills', 'Exercise Bikes', 'Punching Bags',
      'Tennis Rackets', 'Badminton Sets', 'Volleyball', 'Football', 'Basketball',
      'Soccer Ball', 'Golf Clubs', 'Fishing Rods', 'Camping Tents', 'Backpacks',
      'Sleeping Bags', 'Hiking Boots', 'Climbing Gear', 'Bicycles', 'Skateboard'
    ]
  },
  {
    name: 'Books & Media',
    description: 'Books, movies, and educational materials',
    subCategories: [
      'Fiction Books', 'Non-Fiction', 'Educational Books', 'Children Books',
      'Comic Books', 'Textbooks', 'Novels', 'Poetry', 'Biography', 'History',
      'Science Books', 'Self-Help', 'Business Books', 'Movies DVDs', 'Blu-ray',
      'Music CDs', 'Video Games', 'Educational Videos', 'Audiobooks'
    ]
  },
  {
    name: 'Toys & Games',
    description: 'Toys and games for children',
    subCategories: [
      'Action Figures', 'Dolls', 'Building Blocks', 'Puzzle Games', 'Board Games',
      'Card Games', 'Video Games', 'Gaming Accessories', 'Remote Control Toys',
      'Toy Cars', 'Toy Trains', 'Play Sets', 'Educational Toys', 'LEGO Sets',
      'Stuffed Animals', 'Baby Toys', 'Outdoor Toys', 'Sports Toys'
    ]
  },
  {
    name: 'Pet Supplies',
    description: 'Pet food and accessories',
    subCategories: [
      'Dog Food', 'Cat Food', 'Bird Food', 'Fish Food', 'Pet Toys', 'Dog Leashes',
      'Cat Litter', 'Pet Beds', 'Pet Carriers', 'Grooming Supplies', 'Pet Treats',
      'Pet Health', 'Aquariums', 'Pet Cages', 'Pet Clothing', 'Pet Bowls'
    ]
  },
  {
    name: 'Automotive',
    description: 'Car parts and accessories',
    subCategories: [
      'Car Tires', 'Batteries', 'Oil & Fluids', 'Air Filters', 'Spark Plugs',
      'Car Seats', 'Floor Mats', 'Car Covers', 'Dashboard Cameras', 'GPS Devices',
      'Car Speakers', 'Car Lights', 'Wiper Blades', 'Brake Pads', 'Shock Absorbers',
      'Mufflers', 'Exhaust Systems', 'Engine Parts', 'Transmission Fluid', 'Coolant'
    ]
  },
  {
    name: 'Office & Supplies',
    description: 'Office equipment and supplies',
    subCategories: [
      'Desks', 'Office Chairs', 'Filing Cabinets', 'Shelving Units', 'Printer Paper',
      'Notebooks', 'Pens', 'Pencils', 'Markers', 'Highlighters', 'Sticky Notes',
      'Paper Clips', 'Staplers', 'Scissors', 'Tape', 'Envelopes', 'Folders',
      'Binders', 'Desk Lamps', 'Calculators', 'Document Shredders'
    ]
  },

  // ===== CONSTRUCTION TOOLS & MATERIALS =====
  {
    name: 'Hand Tools',
    description: 'Manual construction and repair tools',
    subCategories: [
      'Hammers', 'Wrenches', 'Screwdrivers', 'Pliers', 'Saws', 'Chisels',
      'Files', 'Rasps', 'Measuring Tapes', 'Levels', 'Squares', 'Clamps',
      'Vises', 'Trowels', 'Shovels', 'Spades', 'Axes', 'Hatchets',
      'Pickaxes', 'Crowbars', 'Pry Bars', 'Nail Extractors', 'Bolt Cutters'
    ]
  },
  {
    name: 'Power Tools',
    description: 'Electrical and battery-powered tools',
    subCategories: [
      'Drill Machines', 'Circular Saws', 'Jigsaw Saws', 'Reciprocating Saws',
      'Angle Grinders', 'Sanders', 'Planers', 'Routers', 'Nail Guns',
      'Impact Drivers', 'Screwdrivers', 'Chainsaws', 'Hedge Trimmers',
      'Pressure Washers', 'Electric Staple Guns', 'Rotary Hammers', 'Concrete Mixers'
    ]
  },
  {
    name: 'Building Materials',
    description: 'Construction and building materials',
    subCategories: [
      'Cement', 'Concrete Blocks', 'Bricks', 'Sand', 'Gravel', 'Lumber',
      'Plywood', 'Drywall', 'Insulation', 'Roofing Materials', 'Tiles',
      'Flooring', 'Paint', 'Varnish', 'Adhesives', 'Sealants', 'Caulk',
      'Weatherstripping', 'Nails', 'Screws', 'Bolts', 'Nuts', 'Washers'
    ]
  },
  {
    name: 'Safety Equipment',
    description: 'Construction safety gear',
    subCategories: [
      'Hard Hats', 'Safety Glasses', 'Gloves', 'Safety Boots', 'High-Visibility Vests',
      'Respirators', 'Dust Masks', 'Ear Protection', 'Face Shields', 'Safety Harnesses',
      'Knee Pads', 'Elbow Pads', 'Aprons', 'First Aid Kits', 'Fire Extinguishers',
      'Warning Signs', 'Traffic Cones', 'Safety Tape', 'Flashlights', 'Headlamps'
    ]
  },
  {
    name: 'Plumbing Supplies',
    description: 'Plumbing fixtures and materials',
    subCategories: [
      'Faucets', 'Sinks', 'Toilet Bowls', 'Bathtubs', 'Showerheads', 'Pipes',
      'Fittings', 'Valves', 'Water Heaters', 'Pumps', 'Drains', 'Traps',
      'Wrenches', 'Plungers', 'Plumbing Snake', 'Joint Compound', 'Teflon Tape',
      'Couplings', 'Adapters', 'Caps', 'Reducers', 'Unions'
    ]
  },
  {
    name: 'Electrical Supplies',
    description: 'Electrical components and materials',
    subCategories: [
      'Wires', 'Cables', 'Circuit Breakers', 'Fuses', 'Outlets', 'Switches',
      'Light Fixtures', 'Bulbs', 'Transformers', 'Conduit', 'Junction Boxes',
      'Electrical Panels', 'Batteries', 'Generators', 'Solar Panels', 'Inverters',
      'Extension Cords', 'Power Strips', 'Surge Protectors', 'Breaker Panels'
    ]
  },
  {
    name: 'HVAC Equipment',
    description: 'Heating, ventilation, and air conditioning',
    subCategories: [
      'Air Conditioners', 'Furnaces', 'Heat Pumps', 'Thermostats', 'Ductwork',
      'Dampers', 'Filters', 'Vents', 'Grilles', 'Insulation', 'Refrigerants',
      'Compressors', 'Condensers', 'Evaporators', 'Blower Motors', 'Expansion Valves'
    ]
  },
  {
    name: 'Painting & Finishing',
    description: 'Painting tools and finishing materials',
    subCategories: [
      'Paint Brushes', 'Paint Rollers', 'Paint Pans', 'Painters Tape', 'Drop Cloths',
      'Paint Thinners', 'Paint Primers', 'Latex Paint', 'Oil Paint', 'Acrylic Paint',
      'Varnish', 'Stain', 'Polyurethane', 'Epoxy', 'Lacquer', 'Sealers',
      'Paint Strippers', 'Sandpaper', 'Caulking Guns', 'Spray Guns'
    ]
  },
  {
    name: 'Fasteners & Hardware',
    description: 'Fasteners, hinges, and hardware',
    subCategories: [
      'Nails', 'Screws', 'Bolts', 'Nuts', 'Washers', 'Rivets', 'Anchors',
      'Hinges', 'Locks', 'Door Handles', 'Knobs', 'Latches', 'Hasps',
      'Chains', 'Hooks', 'Eye Bolts', 'Carabiners', 'Shackles', 'D-Rings'
    ]
  },
  {
    name: 'Concrete & Masonry',
    description: 'Concrete and masonry tools',
    subCategories: [
      'Concrete Mixers', 'Concrete Saws', 'Concrete Grinders', 'Chisels',
      'Hammers', 'Trowels', 'Floats', 'Screeds', 'Brushes', 'Grouters',
      'Caulk Guns', 'Mortar Mixers', 'Wheelbarrows', 'Shovels', 'Picks'
    ]
  },

  // ===== PHARMACEUTICAL & HEALTH =====
  {
    name: 'Pain Relief',
    description: 'Over-the-counter pain relievers',
    subCategories: [
      'Paracetamol', 'Ibuprofen', 'Aspirin', 'Naproxen', 'Acetaminophen',
      'Topical Creams', 'Gel Patches', 'Muscle Relaxants', 'Cold Compress'
    ]
  },
  {
    name: 'Cold & Flu',
    description: 'Cold and flu medications',
    subCategories: [
      'Cough Suppressants', 'Expectorants', 'Decongestants', 'Antihistamines',
      'Throat Lozenges', 'Cough Syrup', 'Nasal Sprays', 'Vapor Rubs', 'Honey Cough Drops'
    ]
  },
  {
    name: 'Digestive Health',
    description: 'Digestive medications and supplements',
    subCategories: [
      'Antacids', 'Laxatives', 'Stool Softeners', 'Probiotics', 'Fiber Supplements',
      'Anti-Diarrheal', 'Digestive Enzymes', 'Ginger Tablets', 'Mint Oil Capsules'
    ]
  },
  {
    name: 'Vitamins & Supplements',
    description: 'Vitamins and dietary supplements',
    subCategories: [
      'Vitamin A', 'Vitamin B Complex', 'Vitamin C', 'Vitamin D', 'Vitamin E',
      'Multivitamins', 'Iron Supplements', 'Calcium Supplements', 'Magnesium',
      'Zinc', 'Omega-3', 'Probiotics', 'CoQ10', 'Ginseng', 'Turmeric'
    ]
  },
  {
    name: 'Allergy & Antihistamines',
    description: 'Allergy medications',
    subCategories: [
      'Loratadine', 'Cetirizine', 'Fexofenadine', 'Diphenhydramine', 'Desloratadine',
      'Allergy Eye Drops', 'Antihistamine Creams', 'Allergy Relief Tablets'
    ]
  },
  {
    name: 'Cardiovascular Health',
    description: 'Heart and cardiovascular supplements',
    subCategories: [
      'Blood Pressure Support', 'Cholesterol Support', 'Heart Health Supplements',
      'Garlic Extract', 'Hawthorn Berry', 'Coenzyme Q10', 'Omega-3 Fish Oil'
    ]
  },
  {
    name: 'Sleep & Relaxation',
    description: 'Sleep aids and relaxation products',
    subCategories: [
      'Melatonin', 'Valerian Root', 'Chamomile Tea', 'Lavender Extract',
      'Sleep Gummies', 'Magnesium Sleep Aid', 'L-Theanine', 'Passionflower'
    ]
  },
  {
    name: 'Skincare Medicated',
    description: 'Medicated skincare products',
    subCategories: [
      'Acne Treatments', 'Antifungal Creams', 'Antibacterial Ointments',
      'Hydrocortisone Cream', 'Topical Steroids', 'Wound Care', 'Antibiotic Ointment'
    ]
  },
  {
    name: 'First Aid Supplies',
    description: 'First aid kits and supplies',
    subCategories: [
      'Bandages', 'Gauze Pads', 'Medical Tape', 'Elastic Bandages', 'Antiseptic Wipes',
      'Antibiotic Cream', 'Hydrogen Peroxide', 'Saline Solution', 'Thermometers',
      'Blood Pressure Monitors', 'Glucose Meters', 'Medical Gloves', 'Triangular Bandages'
    ]
  },
  {
    name: 'Respiratory Health',
    description: 'Respiratory and breathing support',
    subCategories: [
      'Inhalers', 'Nebulizers', 'Throat Lozenges', 'Nasal Congestion Relief',
      'Bronchial Support', 'Allergy Relief Sprays', 'Oxygen Therapy', 'Humidifiers'
    ]
  },
  {
    name: 'Topical Treatments',
    description: 'Topical creams and ointments',
    subCategories: [
      'Anti-Itch Creams', 'Hemorrhoid Treatment', 'Fungal Treatments', 'Burn Relief',
      'Bruise Cream', 'Sunburn Relief', 'Psoriasis Treatment', 'Eczema Cream'
    ]
  },
  {
    name: 'Ear & Eye Care',
    description: 'Eye and ear care products',
    subCategories: [
      'Eye Drops', 'Artificial Tears', 'Allergy Eye Relief', 'Contact Lens Solution',
      'Ear Drops', 'Earwax Removal', 'Eye Ointment', 'Antibiotic Eye Drops'
    ]
  },
  {
    name: 'Dental Care',
    description: 'Dental health products',
    subCategories: [
      'Toothpaste', 'Mouthwash', 'Tooth Whitening', 'Dental Floss', 'Tongue Cleaner',
      'Denture Cleaner', 'Mouth Sores Treatment', 'Teeth Sensitivity Relief'
    ]
  },
  {
    name: 'Women Health',
    description: 'Women health products',
    subCategories: [
      'Period Pain Relief', 'Feminine Hygiene', 'Menopause Support', 'Pregnancy Vitamins',
      'Hormonal Balance Supplements', 'Yeast Infection Treatment'
    ]
  },
  {
    name: 'Men Health',
    description: 'Men health products',
    subCategories: [
      'Hair Loss Treatment', 'Prostate Support', 'Male Enhancement', 'Testosterone Support',
      'Fertility Supplements', 'Energy Boosters'
    ]
  },
  {
    name: 'Immunity Boosters',
    description: 'Immune system support',
    subCategories: [
      'Vitamin C Supplements', 'Immune Complex', 'Echinacea', 'Elderberry',
      'Zinc Supplements', 'Garlic Extract', 'Astragalus', 'Immunity Gummies'
    ]
  },
  {
    name: 'Anti-Inflammatory',
    description: 'Anti-inflammatory supplements',
    subCategories: [
      'Turmeric Curcumin', 'Ginger Supplements', 'Boswellia Extract', 'Quercetin',
      'Bromelain', 'Devil\'s Claw', 'Willow Bark', 'Green Tea Extract'
    ]
  },
  {
    name: 'Joint & Bone Health',
    description: 'Joint and bone support',
    subCategories: [
      'Glucosamine', 'Chondroitin', 'Collagen', 'Calcium', 'Vitamin D3',
      'MSM', 'Hyaluronic Acid', 'Bone Support Complex'
    ]
  },
  {
    name: 'Mental Health',
    description: 'Mental health and mood support',
    subCategories: [
      'Stress Relief', 'Anxiety Support', 'Depression Support', 'Focus & Concentration',
      'ADHD Support', 'Memory Enhancement', 'L-Theanine', 'GABA Supplements'
    ]
  },
  {
    name: 'Diabetes Management',
    description: 'Diabetes care products',
    subCategories: [
      'Blood Sugar Support', 'Glucose Monitors', 'Test Strips', 'Lancets',
      'Insulin Pens', 'Syringes', 'Diabetes Supplements', 'Chromium Picolinate'
    ]
  },
  {
    name: 'Weight Management',
    description: 'Weight loss and management supplements',
    subCategories: [
      'Weight Loss Pills', 'Appetite Suppressants', 'Metabolism Boosters',
      'Protein Powder', 'Fiber Supplements', 'Conjugated Linoleic Acid', 'Carb Blockers'
    ]
  },
  {
    name: 'Hair & Nails',
    description: 'Hair and nail health supplements',
    subCategories: [
      'Biotin', 'Hair Growth Supplements', 'Hair Loss Treatment', 'Nail Strength Formula',
      'Collagen for Hair', 'DHT Blockers', 'Hair Vitamins', 'Scalp Treatment'
    ]
  },
  {
    name: 'Muscle & Sports',
    description: 'Sports and muscle support',
    subCategories: [
      'Protein Supplements', 'Creatine', 'BCAA', 'Pre-Workout', 'Post-Workout',
      'Amino Acids', 'Muscle Relaxants', 'Recovery Supplements'
    ]
  },
  {
    name: 'Herbal Remedies',
    description: 'Traditional herbal medicines',
    subCategories: [
      'Ashwagandha', 'Rhodiola', 'Adaptogens', 'Herbal Teas', 'Traditional Tonics',
      'Ayurvedic Supplements', 'Chinese Herbs', 'Homeopathic Remedies'
    ]
  },
  {
    name: 'Drug Testing Kits',
    description: 'Drug and substance testing kits',
    subCategories: [
      'Drug Test Strips', 'Alcohol Testing Devices', 'Glucose Testing Kits',
      'Pregnancy Tests', 'COVID-19 Tests', 'Rapid Test Kits'
    ]
  },
  {
    name: 'Medical Devices',
    description: 'Home medical devices',
    subCategories: [
      'Blood Pressure Monitors', 'Pulse Oximeters', 'Thermometers', 'Glucose Meters',
      'Nebulizers', 'TENS Units', 'Muscle Stimulators', 'Heating Pads'
    ]
  }
];

const seedCategories = async () => {
  try {
    // Sync database
    await sequelize.sync();

    console.log(`Processing ${categoriesData.length} categories...`);

    // Prepare bulk data
    const categoriesToInsert = [];
    const subcategoriesToInsert = [];

    // Get existing category names to avoid duplicates
    const existingCategories = await sequelize.query(
      `SELECT name FROM categories WHERE isDeleted = 0`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const existingCatNames = new Set(existingCategories.map(c => c.name));

    for (const catData of categoriesData) {
      if (!existingCatNames.has(catData.name)) {
        categoriesToInsert.push({
          name: catData.name,
          description: catData.description,
          imageUrl: null,
          dateAdded: new Date(),
          dateModified: new Date(),
          isDeleted: false,
        });
      }
    }

    let newCategoryCount = 0;
    if (categoriesToInsert.length > 0) {
      const newCategories = await Category.bulkCreate(categoriesToInsert);
      newCategoryCount = newCategories.length;
      console.log(`✓ Created ${newCategoryCount} new categories`);

      // Now create subcategories for new categories
      for (const newCat of newCategories) {
        const catData = categoriesData.find(c => c.name === newCat.name);
        if (catData) {
          for (const subCatName of catData.subCategories) {
            subcategoriesToInsert.push({
              categoryId: newCat.id,
              name: subCatName,
              description: `${subCatName} under ${catData.name}`,
              isDeleted: false,
            });
          }
        }
      }
    }

    // Add subcategories for existing categories (if they don't have all subcategories)
    const allCategories = await Category.findAll({ attributes: ['id', 'name'] });
    for (const category of allCategories) {
      const catData = categoriesData.find(c => c.name === category.name);
      if (catData) {
        const existingSubs = await sequelize.query(
          `SELECT name FROM subcategories WHERE categoryId = ? AND isDeleted = 0`,
          { 
            replacements: [category.id],
            type: sequelize.QueryTypes.SELECT 
          }
        );
        const existingSubNames = new Set(existingSubs.map(s => s.name));

        for (const subCatName of catData.subCategories) {
          if (!existingSubNames.has(subCatName)) {
            subcategoriesToInsert.push({
              categoryId: category.id,
              name: subCatName,
              description: `${subCatName} under ${catData.name}`,
              isDeleted: false,
            });
          }
        }
      }
    }

    let newSubcategoryCount = 0;
    if (subcategoriesToInsert.length > 0) {
      await SubCategory.bulkCreate(subcategoriesToInsert);
      newSubcategoryCount = subcategoriesToInsert.length;
      console.log(`✓ Created ${newSubcategoryCount} new subcategories`);
    }

    // Get final counts
    const totalCategories = await Category.count({ where: { isDeleted: false } });
    const totalSubcategories = await SubCategory.count({ where: { isDeleted: false } });

    console.log(`\n✓ Seeding complete!`);
    console.log(`  - New categories added: ${newCategoryCount}`);
    console.log(`  - New subcategories added: ${newSubcategoryCount}`);
    console.log(`\n  Total active categories: ${totalCategories}`);
    console.log(`  Total active subcategories: ${totalSubcategories}`);
    console.log(`  Total entries: ${totalCategories + totalSubcategories}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error.message);
    process.exit(1);
  }
};

// Run seeder
seedCategories();
