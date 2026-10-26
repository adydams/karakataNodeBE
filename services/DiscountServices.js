const { Discount } = require("../models");
const { Op } = require("sequelize");

class discountServices {
  async validate(code, orderTotal) {
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

    if (!discount) throw new Error("Invalid or expired discount code");
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      throw new Error("This discount code has reached its usage limit");
    }
    if (orderTotal < discount.minOrderAmount) {
      throw new Error(
        `A minimum order of ₦${discount.minOrderAmount} is required for this code`
      );
    }

    return discount;
  }

  /**
   * Finds the best active automatic discount based on the order total.
   */
  async findActiveAutomaticDiscount(orderTotal) {
    const discounts = await Discount.findAll({
      where: {
        isAutomatic: true,
        isActive: true,
        isDeleted: false,
        minOrderAmount: { [Op.lte]: orderTotal },
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } },
        ],
      },
      order: [["value", "DESC"]], // Simplified: assume higher value is better
    });

    if (discounts.length === 0) return null;

    // Find the one that actually gives the most discount
    let bestDiscount = null;
    let maxSavings = -1;

    for (const disc of discounts) {
      const { discountAmount } = this.apply(disc, orderTotal);
      if (discountAmount > maxSavings) {
        maxSavings = discountAmount;
        bestDiscount = disc;
      }
    }

    return bestDiscount;
  }

  apply(discount, orderTotal) {

    let discountAmount = 0;

    if (discount.type === "PERCENTAGE") {
      discountAmount = (parseFloat(discount.value) / 100) * orderTotal;
    } else {
      discountAmount = parseFloat(discount.value);
    }

    // Never discount more than the order total
    discountAmount = Math.min(discountAmount, orderTotal);
    const finalTotal = orderTotal - discountAmount;

    return { discountAmount: parseFloat(discountAmount.toFixed(2)), finalTotal };
  }

  async incrementUsage(discountId, transaction) {
    await Discount.increment("usedCount", {
      by: 1,
      where: { id: discountId },
      transaction,
    });
  }

  async create({ code, type, value, minOrderAmount, maxUses, expiresAt }) {
    return Discount.create({
      code: code.toUpperCase().trim(),
      type,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
    });
  }
}

module.exports = new discountServices();