const { Op } = require("sequelize");
const sequelize = require("../db/database");
const { Inventory, Product, StorePickupStation } = require("../models");

class InventoryServices {
  /**
   * Sellable stock right now at one station.
   * What you check before letting someone add to cart.
   */
  async getAvailableStock(productId, pickupStationId) {
    const inv = await Inventory.findOne({
      where: { productId, pickupStationId, isDeleted: false },
    });
    if (!inv) return 0;
    return inv.quantityOnHand - inv.quantityReserved;
  }

  /**
   * Every station holding this product, with available stock per station.
   */
  async getStockAcrossStations(productId) {
    const rows = await Inventory.findAll({
      where: { productId, isDeleted: false },
      attributes: ["id", "productId", "pickupStationId", "quantityOnHand", "quantityReserved", "lowStockThreshold", "isDeleted"],
    });
    return rows.map((r) => ({
      pickupStationId: r.pickupStationId,
      quantityOnHand: r.quantityOnHand,
      quantityReserved: r.quantityReserved,
      available: r.quantityOnHand - r.quantityReserved,
    }));
  }

  /**
   * Stations that can cover `quantity` units of this product ALONE.
   */
  async findStationsWithStock(productId, quantity) {
    return Inventory.findAll({
      where: {
        productId,
        isDeleted: false,
        [Op.and]: sequelize.literal(
          `\`quantityOnHand\` - \`quantityReserved\` >= ${Number(quantity)}`
        ),
      },
      attributes: ["id", "productId", "pickupStationId", "quantityOnHand", "quantityReserved", "lowStockThreshold", "isDeleted"],
      order: [
        [sequelize.literal("(`quantityOnHand` - `quantityReserved`)"), "DESC"],
      ],
    });
  }

  /**
   * Hold stock for an unpaid order. Atomic: the WHERE clause checks
   * availability AND does the increment in one statement.
   */
  async reserveStock(productId, pickupStationId, quantity, transaction) {
    if (quantity <= 0) throw new Error("Reservation quantity must be positive");

    const [affectedRows] = await Inventory.update(
      { quantityReserved: sequelize.literal(`\`quantityReserved\` + ${quantity}`) },
      {
        where: {
          productId,
          pickupStationId,
          isDeleted: false,
          [Op.and]: sequelize.literal(
            `\`quantityOnHand\` - \`quantityReserved\` >= ${Number(quantity)}`
          ),
        },
        transaction,
      }
    );

    if (affectedRows === 0) {
      throw new Error(
        `Insufficient stock for product ${productId} at station ${pickupStationId}`
      );
    }
  }

  /**
   * Payment failed / order cancelled. Give the hold back to available pool.
   */
  async releaseReservation(productId, pickupStationId, quantity, transaction) {
    if (quantity <= 0) throw new Error("Release quantity must be positive");

    const [affectedRows] = await Inventory.update(
      {
        quantityReserved: sequelize.literal(
          `GREATEST(\`quantityReserved\` - ${quantity}, 0)`
        ),
      },
      { where: { productId, pickupStationId, isDeleted: false }, transaction }
    );

    if (affectedRows === 0) {
      throw new Error(
        `No inventory record for product ${productId} at station ${pickupStationId}`
      );
    }
  }

  /**
   * Payment confirmed: units actually leave the building.
   * Deduct from quantityOnHand (physically gone) AND quantityReserved.
   */
  async commitReservation(productId, pickupStationId, quantity, transaction) {
    if (quantity <= 0) throw new Error("Commit quantity must be positive");

    const [affectedRows] = await Inventory.update(
      {
        quantityOnHand: sequelize.literal(`\`quantityOnHand\` - ${quantity}`),
        quantityReserved: sequelize.literal(
          `GREATEST(\`quantityReserved\` - ${quantity}, 0)`
        ),
      },
      {
        where: {
          productId,
          pickupStationId,
          isDeleted: false,
          quantityOnHand: { [Op.gte]: quantity },
        },
        transaction,
      }
    );

    if (affectedRows === 0) {
      throw new Error(
        `Cannot fulfil ${quantity} units of product ${productId} at station ${pickupStationId} — stock mismatch`
      );
    }

    await this.syncProductStockCache(productId, transaction);
  }

  /**
   * Stock-in. findOrCreate means the row appears the first time it gets stock.
   */
  async restock(productId, pickupStationId, quantity, transaction) {
    if (quantity <= 0) throw new Error("Restock quantity must be positive");

    const [inv] = await Inventory.findOrCreate({
      where: { productId, pickupStationId },
      defaults: { quantityOnHand: 0, quantityReserved: 0 },
      transaction,
    });

    await Inventory.update(
      { quantityOnHand: sequelize.literal(`\`quantityOnHand\` + ${quantity}`) },
      { where: { id: inv.id }, transaction }
    );

    await this.syncProductStockCache(productId, transaction);
    return inv;
  }

  /**
   * Validate stock without holding it. Unpaid orders must not reserve
   * stock (carts are not holds); stock is deducted only when payment
   * is verified (commitForOrder).
   */
  async validateAvailabilityForOrder(items, transaction) {
    for (const item of items) {
      const inv = await Inventory.findOne({
        where: { productId: item.productId, pickupStationId: item.pickupStationId, isDeleted: false },
        transaction,
      });
      const available = inv
        ? Number(inv.quantityOnHand || 0) - Number(inv.quantityReserved || 0)
        : 0;
      if (available < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${item.productId} at station ${item.pickupStationId}. Please review your cart and try again.`
        );
      }
    }
  }

  async reserveForOrder(items, transaction) {
    for (const item of items) {
      await this.reserveStock(item.productId, item.pickupStationId, item.quantity, transaction);
    }
  }

  async commitForOrder(items, transaction) {
    for (const item of items) {
      await this.commitReservation(item.productId, item.pickupStationId, item.quantity, transaction);
    }
  }

  async releaseForOrder(items, transaction) {
    for (const item of items) {
      await this.releaseReservation(item.productId, item.pickupStationId, item.quantity, transaction);
    }
  }

  async isLowStock(productId, pickupStationId) {
    const inv = await Inventory.findOne({ where: { productId, pickupStationId, isDeleted: false } });
    if (!inv) return false;
    return inv.quantityOnHand - inv.quantityReserved <= inv.lowStockThreshold;
  }

  async syncProductStockCache(productId, transaction) {
    const inventoryRows = await Inventory.findAll({
      attributes: [
        [sequelize.literal("GREATEST(quantityOnHand - quantityReserved, 0)"), "available"],
      ],
      where: { productId, isDeleted: false },
      raw: true,
      transaction,
    });
    const total = inventoryRows.reduce(
      (sum, row) => sum + Number(row.available || 0),
      0
    );
    await Product.update(
      { stockQuantity: total || 0 },
      { where: { id: productId }, transaction }
    );
  }
}

module.exports = new InventoryServices();
