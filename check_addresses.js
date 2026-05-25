const { ShippingAddress } = require('./models');

async function checkAddresses() {
  try {
    const addresses = await ShippingAddress.findAll();
    console.log(`Found ${addresses.length} shipping addresses.`);
    addresses.forEach(addr => {
      console.log(`ID: ${addr.id}, City: ${addr.city}`);
    });
  } catch (err) {
    console.error("Error fetching addresses:", err);
  }
}

checkAddresses();
