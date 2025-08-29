const deliveryService = require('../services/deliveryServices');

exports.createDelivery = async (req, res) => {
  try {
    const delivery = await deliveryService.create(req.body);
    res.status(201).json({ success: true, data: delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listDeliveries = async (req, res) => {
  try {
    const deliveries = await deliveryService.listByOrder(req.params.orderId);
    res.json({ success: true, data: deliveries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDelivery = async (req, res) => {
  try {
    const delivery = await deliveryService.getById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDelivery = async (req, res) => {
  try {
    const updated = await deliveryService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const removed = await deliveryService.remove(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};