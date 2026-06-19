const { Inventory, Product } = require("../models");

class InventoryServices {
  async getByProduct(productId) {
    const inv = await Inventory.findOne({ where: { productId, isDeleted: false } });
    if (!inv) throw new Error("Inventory record not found");
    return inv;
  }

  async adjust(productId, delta, transaction) {
    const inv = await Inventory.findOne({
      where: { productId, isDeleted: false },
      transaction,
      lock: transaction?.LOCK?.UPDATE,
    });
    if (!inv) throw new Error(`No inventory record for product ${productId}`);

    const newQty = inv.quantityOnHand + delta;
    if (newQty < 0) throw new Error(`Insufficient stock for product ${productId}`);

    inv.quantityOnHand = newQty;
    await inv.save({ transaction });

    // Sync Product.stockQuantity to stay consistent
    await Product.update(
      { stockQuantity: newQty },
      { where: { id: productId }, transaction }
    );

    return inv;
  }

  // Call this after a successful order to deduct stock for each item
  async deductForOrder(items, transaction) {
    for (const item of items) {
      await this.adjust(item.productId, -item.quantity, transaction);
    }
  }

  async restock(productId, quantity, transaction) {
    if (quantity <= 0) throw new Error("Restock quantity must be positive");
    return this.adjust(productId, quantity, transaction);
  }

  async isLowStock(productId) {
    const inv = await this.getByProduct(productId);
    return inv.quantityOnHand <= inv.lowStockThreshold;
  }
}

module.exports = new InventoryServices();