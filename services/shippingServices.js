const { ShippingAddress } = require('../models');

class ShippingService {
  async create(data) {
    return ShippingAddress.create(data);
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
