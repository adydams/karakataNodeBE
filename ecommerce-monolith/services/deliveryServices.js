const { Delivery } = require('../models');

class DeliveryServices {
  async create(data) {
    return Delivery.create(data);
  }

  async listByOrder(orderId) {
    return Delivery.findAll({ where: { orderId } });
  }

  async getById(id) {
    return Delivery.findByPk(id);
  }

  async update(id, data) {
    const delivery = await Delivery.findByPk(id);
    if (!delivery) return null;
    return delivery.update(data);
  }

  async remove(id) {
    const delivery = await Delivery.findByPk(id);
    if (!delivery) return null;
    await delivery.destroy();
    return true;
  }
}

module.exports = new DeliveryServices();
