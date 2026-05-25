const { ShippingAddress } = require('./models');

async function createAddress() {
  try {
    const addressId = 'ad3efa24-4629-4124-b4ce-25d4d971b1ba';
    const userId = '0da034c0-5eec-4d7e-89ec-26e35690b115';

    const addr = await ShippingAddress.create({
      id: addressId,
      userId: userId,
      addressLine1: '123 Main Street',
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '100001',
      country: 'Nigeria',
    });
    console.log(`Created shipping address with ID: ${addr.id}`);
  } catch (err) {
    console.error("Error creating address:", err);
  }
}

createAddress();
