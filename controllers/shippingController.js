// controllers/shippingController.js
const shippingService = require('../services/shippingServices');

class ShippingController {
  // Shipping Address
  async createAddress(req, res) {
    try {
      const address = await shippingService.createShippingAddress(req.body);
      res.status(201).json(address);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async getAddress(req, res) {
    try {
      const address = await shippingService.getShippingAddressById(req.params.id);
      if (!address) return res.status(404).json({ error: 'Not found' });
      res.json(address);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async updateAddress(req, res) {
    try {
      const address = await shippingService.updateShippingAddress(req.params.id, req.body);
      res.json(address);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async deleteAddress(req, res) {
    try {
      await shippingService.deleteShippingAddress(req.params.id);
      res.status(204).send();
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async listAddresses(req, res) {
    try {
      const addresses = await shippingService.listShippingAddresses(req.params.userId);
      res.json(addresses);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  // Delivery
  async createDelivery(req, res) {
    try {
      const delivery = await shippingService.createDelivery(req.body);
      res.status(201).json(delivery);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async getDelivery(req, res) {
    try {
      const delivery = await shippingService.getDeliveryById(req.params.id);
      if (!delivery) return res.status(404).json({ error: 'Not found' });
      res.json(delivery);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async updateDelivery(req, res) {
    try {
      const delivery = await shippingService.updateDelivery(req.params.id, req.body);
      res.json(delivery);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async deleteDelivery(req, res) {
    try {
      await shippingService.deleteDelivery(req.params.id);
      res.status(204).send();
    } catch (err) { res.status(400).json({ error: err.message }); }
  }

  async listDeliveries(req, res) {
    try {
      const deliveries = await shippingService.listDeliveries(req.params.orderId);
      res.json(deliveries);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
}

module.exports = new ShippingController();
