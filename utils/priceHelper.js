/**
 * Utility to calculate the current price of a product based on tiered discounts.
 *
 * Logic:
 * 1. Fetch active discounts for the product.
 * 2. Filter rules based on the quantity requested.
 * 3. If multiple rules match, pick the one that gives the lowest final price.
 */
async function calculateCurrentPrice(product, quantity = 1) {
  if (!product) {
    return { finalPrice: 0, isDiscounted: false, originalPrice: 0 };
  }

  const originalPrice = parseFloat(product.price || 0);
  const discounts = Array.isArray(product.discounts)
    ? product.discounts
    : product.discounts ? [product.discounts] : [];
  const now = new Date();

  // Find all active rules that match the current quantity
  const matchingRules = discounts.filter(rule => {
    const startDate = rule.startDate ? new Date(rule.startDate) : null;
    const endDate = rule.endDate ? new Date(rule.endDate) : null;

    const dateValid = (!startDate || now >= startDate) && (!endDate || now <= endDate);
    const qtyValid = quantity >= rule.minQuantity && (!rule.maxQuantity || quantity <= rule.maxQuantity);
    const active = rule.isActive !== false;

    return dateValid && qtyValid && active;
  });

  if (matchingRules.length === 0) {
    return {
      finalPrice: originalPrice,
      isDiscounted: false,
      originalPrice: originalPrice
    };
  }

  // Pick the rule that results in the lowest price
  let bestPrice = originalPrice;
  let bestRule = null;

  for (const rule of matchingRules) {
    let currentRulePrice = originalPrice;
    if (rule.discountType === 'PERCENTAGE') {
      const discountAmount = originalPrice * (parseFloat(rule.value) / 100);
      currentRulePrice = originalPrice - discountAmount;
    } else if (rule.discountType === 'FIXED') {
      currentRulePrice = originalPrice - parseFloat(rule.value);
    }

    if (currentRulePrice < bestPrice) {
      bestPrice = currentRulePrice;
      bestRule = rule;
    }
  }

  return {
    finalPrice: parseFloat(Math.max(0, bestPrice).toFixed(2)),
    isDiscounted: bestRule !== null,
    originalPrice: originalPrice,
    appliedDiscountId: bestRule ? bestRule.id : null,
    discountValue: bestRule ? bestRule.value : null,
    discountType: bestRule ? bestRule.discountType : null
  };
}

module.exports = {
  calculateCurrentPrice
};
