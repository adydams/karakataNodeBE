const { ShippingAddress } = require('../models');

class ShippingService {
  async create(data) {
    
  // 1. Check if order exists and belongs to the user
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    throw new Error("Invalid orderId or order does not belong to user");
  }

  // 2. Ensure payment is verified before saving address
  if (order.status !== "PAID") {
    throw new Error("Cannot save address. Order payment not verified.");
  }
      // 3. Save address
  const address = await ShippingAddress.create({
    userId,
    orderId,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  });

  return address;
}
  

  async listByUser(userId) {
    return ShippingAddress.findAll({ where: { userId } });
  }

  async getById(id) {
    return ShippingAddress.findByPk(id);
  }

  async update(id, data) {
    const address = await ShippingAddress.findByPk(id);
    if (!address) return null;
    return address.update(data);
  }

  async remove(id) {
    const address = await ShippingAddress.findByPk(id);
    if (!address) return null;
    await address.destroy();
    return true;
  }
}

module.exports = new ShippingService();
