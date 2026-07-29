const { SystemSetting, Store } = require("../models");

class AdminSettingsController {
  async getSettings(req, res) {
    try {
      const setting = await SystemSetting.findOne();
      return res.status(200).json({
        success: true,
        data: setting,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateSettings(req, res) {
    try {
      const setting = await SystemSetting.findOne();
      if (!setting) {
        return res.status(404).json({ success: false, message: "Settings not found" });
      }
      await setting.update(req.body);
      return res.status(200).json({
        success: true,
        message: "System settings updated",
        data: setting,
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateStoreCommission(req, res) {
    try {
      const { id } = req.params;
      const { commissionRate } = req.body;
      const store = await Store.findByPk(id);
      if (!store) return res.status(404).json({ success: false, message: "Store not found" });

      await store.update({ commissionRate });
      return res.status(200).json({
        success: true,
        message: "Store commission rate updated",
        data: store,
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AdminSettingsController();
