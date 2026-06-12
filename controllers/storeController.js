const storeService = require("../services/storeServices");

class StoreController {
  async create(req, res) {
     
    try {
      console.log("Create store request received:", { body: req.user, user: req.user });
      const userId = req.user.id; // Assuming you have user info in req.user
      if (!userId) {
        return res.status(400).json({ success: false, message: "User login required" });
      }
      const store = await storeService.createStore(req.body, userId);
      res.status(201).json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const stores = await storeService.getAllStores();
      res.json({ success: true, data: stores });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const store = await storeService.getStoreById(req.params.id);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const store = await storeService.updateStore(req.params.id, req.body);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const store = await storeService.deleteStore(req.params.id);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      res.json({ success: true, message: "Store deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new StoreController();
