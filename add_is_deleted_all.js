const sequelize = require('./db/database');

const tablesToUpdate = [
  'brands',
  'deliveries',
  'favorites',
  'product_images',
  'orderitems',
  'orders',
  'payments',
  'reviews',
  'stores',
  'users'
];

async function addIsDeletedColumns() {
  try {
    console.log('Adding isDeleted column to tables...');
    for (const table of tablesToUpdate) {
      try {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE;`);
        console.log(`Successfully added isDeleted to ${table}`);
      } catch (err) {
        if (err.message.includes('Duplicate column name')) {
          console.log(`Column isDeleted already exists in ${table}, skipping.`);
        } else {
          console.error(`Error adding isDeleted to ${table}:`, err.message);
        }
      }
    }
    console.log('Finished updating tables.');
  } catch (error) {
    console.error('General error during DB update:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addIsDeletedColumns();
