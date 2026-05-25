const { User, ShippingAddress } = require('./models');

async function checkUsers() {
  try {
    const users = await User.findAll();
    console.log(`Found ${users.length} users.`);
    users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name || u.fullName}`));
  } catch (err) {
    console.error("Error fetching users:", err);
  }
}

checkUsers();
