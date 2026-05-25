// const { ShippingAddress } = require('../models');

// class ShippingService {
//   async createShippingAddress(data) {
//     const {
//       userId,
//       addressLine1,
//       city,
//       state,
//       postalCode,
//       country,
//       addressLine2,
//     } = data;

//     const payload = {
//       userId,
//       addressLine1,
//       city,
//       state,
//       postalCode,
//       country,
//       addressLine2: addressLine2 || null,
//     };

//     const address = await ShippingAddress.create(payload);

//     return address;
//   }

//   async listShippingAddresses(userId) {
//     return ShippingAddress.findAll({ where: { userId } });
//   }

//   async getShippingAddressById(id) {
//     return ShippingAddress.findByPk(id);
//   }

//   async updateShippingAddress(id, data) {
//     const address = await ShippingAddress.findByPk(id);
//     if (!address) return null;
//     return address.update(data);
//   }

//   async deleteShippingAddress(id) {
//     const address = await ShippingAddress.findByPk(id);
//     if (!address) return null;
//     await address.destroy();
//     return true;
//   }
// }

// module.exports = new ShippingService();
