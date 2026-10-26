const { Discount } = require("../models");
const { Op } = require("sequelize");

class AdminDiscountController {
  /**
   * Get all discounts with optional filtering
   */
  async getAllDiscounts(req, res) {
    try {
      const { isAutomatic, isActive, displayInAdverts } = req.query;
      const where = { isDeleted: false };

      if (isAutomatic !== undefined) {
        where.isAutomatic = isAutomatic === "true";
      }
      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }
      if (displayInAdverts !== undefined) {
        where.displayInAdverts = displayInAdverts === "true";
      }

      const discounts = await Discount.findAll({ where, order: [["createdAt", "DESC"]] });
      return res.json({ success: true, data: discounts });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new discount (Automatic or Code-based)
   */
  async createDiscount(req, res) {
    try {
      const { title, code, type, value, minOrderAmount, maxUses, expiresAt, isAutomatic, displayInAdverts, advertStartDate, advertEndDate } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: "Discount title is required" });
      }
      // If it's an automatic discount, the code is optional/internal
      if (!isAutomatic && !code) {
        return res.status(400).json({ success: false, message: "Coupon code is required for manual discounts" });
      }

      const discount = await Discount.create({
        title: title.trim(),
        code: isAutomatic ? `AUTO-${Date.now()}` : code.toUpperCase().trim(),
        type,
        value,
        minOrderAmount: minOrderAmount || 0,
        maxUses: maxUses || null,
        expiresAt: expiresAt || null,
        isAutomatic: isAutomatic || false,
        displayInAdverts: displayInAdverts || false,
        advertStartDate: advertStartDate || null,
        advertEndDate: advertEndDate || null,
      });

      return res.status(201).json({ success: true, data: discount });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Update an existing discount
   */
  async updateDiscount(req, res) {
    try {
      const { id } = req.params;
      const { title, code, type, value, minOrderAmount, maxUses, expiresAt, isActive, isAutomatic, displayInAdverts, advertStartDate, advertEndDate } = req.body;

      const discount = await Discount.findByPk(id);
      if (!discount) return res.status(404).json({ success: false, message: "Discount not found" });

      await discount.update({
        title: title?.trim() || discount.title,
        code: !isAutomatic && code ? code.toUpperCase().trim() : discount.code,
        type,
        value,
        minOrderAmount,
        maxUses,
        expiresAt,
        isActive,
        isAutomatic,
        displayInAdverts,
        advertStartDate: advertStartDate || null,
        advertEndDate: advertEndDate || null,
      });

      return res.json({ success: true, data: discount });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Toggle discount status
   */
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const discount = await Discount.findByPk(id);
      if (!discount) return res.status(404).json({ success: false, message: "Discount not found" });

      discount.isActive = !discount.isActive;
      await discount.save();

      return res.json({ success: true, data: discount });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Soft delete a discount
   */
  async deleteDiscount(req, res) {
    try {
      const { id } = req.params;
      await Discount.update({ isDeleted: true }, { where: { id } });
      return res.json({ success: true, message: "Discount deleted successfully" });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AdminDiscountController();
