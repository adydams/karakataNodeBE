const PickupStationService = require("../services/pickupStationServices");

class PickupStationController {
  async create(req, res) {
    try {
      const data = req.body;
      const station = await PickupStationService.createPickupStation(data);
      return res.status(201).json({
        success: true,
        message: "Pickup station created successfully",
        data: station,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getAll(req, res) {
    try {
      const stations = await PickupStationService.getAllPickupStations();
      return res.status(200).json({
        success: true,
        data: stations,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getByStore(req, res) {
    try {
      const { storeId } = req.params;
      const stations = await PickupStationService.getPickupStationsByStore(storeId);
      return res.status(200).json({
        success: true,
        data: stations,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getOne(req, res) {
    try {
      const station = await PickupStationService.getPickupStationById(req.params.id);
      if (!station) {
        return res.status(404).json({
          success: false,
          message: "Pickup station not found",
        });
      }
      return res.status(200).json({
        success: true,
        data: station,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async update(req, res) {
    try {
      const station = await PickupStationService.updatePickupStation(
        req.params.id,
        req.body
      );
      if (!station) {
        return res.status(404).json({
          success: false,
          message: "Pickup station not found",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Pickup station updated successfully",
        data: station,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async delete(req, res) {
    try {
      const station = await PickupStationService.deletePickupStation(req.params.id);
      if (!station) {
        return res.status(404).json({
          success: false,
          message: "Pickup station not found",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Pickup station deleted successfully",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async assignProduct(req, res) {
    try {
      const { productId, stationId, initialStock } = req.body;
      const result = await PickupStationService.assignProductToStation(productId, stationId, initialStock);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateStock(req, res) {
    try {
      const { inventoryId, productPickupStationId, productId, pickupStationId, newQuantity } = req.body;
      const updatedInv = await PickupStationService.updateStationStock(
        { inventoryId, productPickupStationId, productId, pickupStationId },
        newQuantity
      );
      return res.status(200).json({ success: true, data: updatedInv });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new PickupStationController();
