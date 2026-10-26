const { Discount } = require("../models");
const { Op } = require("sequelize");

class DiscountPreviewController {
  async preview(req, res) {
    try {
      const { code, orderTotal } = req.body;
      const total = parseFloat(orderTotal || 0);
      if (isNaN(total) || total <= 0) {
        return res.status(400).json({ success: false, message: "Valid order total is required for preview" });
      }

      // 1. Check manual code if provided
      let manualDiscount = null;
      let manualAmount = 0;
      if (code) {
        const discount = await Discount.findOne({
          where: {
            code: code.toUpperCase().trim(),
            isActive: true,
            isDeleted: false,
            [Op.or]: [
              { expiresAt: null },
              { expiresAt: { [Op.gt]: new Date() } },
            ],
          },
        });
        if (discount && total >= discount.minOrderAmount) {
          manualDiscount = discount;
          const amount = discount.type === "PERCENTAGE"
            ? (parseFloat(discount.value) / 100) * total
            : parseFloat(discount.value);
          manualAmount = Math.min(amount, total);
        }
      }

      // 2. Check for automatic promos
      const autoDiscounts = await Discount.findAll({
        where: {
          isAutomatic: true,
          isActive: true,
          isDeleted: false,
          minOrderAmount: { [Op.lte]: total },
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
          ],
        },
      });

      let autoDiscount = null;
      let autoAmount = 0;
      for (const disc of autoDiscounts) {
        const amount = disc.type === "PERCENTAGE"
          ? (parseFloat(disc.value) / 100) * total
          : parseFloat(disc.value);
        const finalAmt = Math.min(amount, total);
        if (finalAmt > autoAmount) {
          autoAmount = finalAmt;
          autoDiscount = disc;
        }
      }

      // 3. Determine the best deal
      let finalDiscount = null;
      let finalAmount = 0;
      let isAutomatic = false;

      if (manualAmount > autoAmount) {
        finalDiscount = manualDiscount;
        finalAmount = manualAmount;
        isAutomatic = false;
      } else if (autoAmount > 0) {
        finalDiscount = autoDiscount;
        finalAmount = autoAmount;
        isAutomatic = true;
      }

      return res.json({
        success: true,
        discountAmount: parseFloat(finalAmount.toFixed(2)),
        discountCode: finalDiscount?.code || null,
        isAutomatic,
        discountLabel: finalDiscount
          ? finalDiscount.title
          : null,
        discountTitle: finalDiscount?.title || null,
        finalTotal: parseFloat((total - finalAmount).toFixed(2))
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new DiscountPreviewController();
