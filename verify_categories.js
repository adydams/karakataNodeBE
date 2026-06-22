const Category = require('./models/categoryModel');
const SubCategory = require('./models/subCategoryModel');

(async () => {
  try {
    const categories = await Category.findAll({ 
      attributes: ['name'],
      where: { isDeleted: false },
      order: [['name', 'ASC']]
    });
    
    console.log('\nAll Categories:\n');
    categories.forEach((cat, i) => console.log(`  ${i+1}. ${cat.name}`));
    
    console.log('\n\nSample Subcategories:\n');
    const subCats = await SubCategory.findAll({ 
      attributes: ['name'],
      where: { isDeleted: false },
      limit: 30,
      order: [['name', 'ASC']]
    });
    subCats.forEach(sub => console.log(`  - ${sub.name}`));
    
    console.log(`\n\n✓ Total: ${categories.length} categories with ${await SubCategory.count()} subcategories`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
})();
