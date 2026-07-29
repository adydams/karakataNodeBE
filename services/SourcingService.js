const {
  Product,
  ProductPickupStation,
  Inventory,
  StorePickupStation
} = require("../models");

class SourcingService {
  /**
   * Allocates required quantity of a product across available stations.
   * @param {string} productId - The product to source.
   * @param {number} requiredQty - Quantity needed.
   * @param {Object} preference - { receiverAddress?: Address, chosenStationId?: string }
   * @returns {Promise<{ allocations: Array, fetchRate: number }>}
   */
  async allocateStock(productId, requiredQty, preference = {}) {
    const { receiverAddress, chosenStationId } = preference;

    // 1. Get all stations that have this product
    const productStations = await ProductPickupStation.findAll({
      where: { productId, isActive: true },
      include: [
        { model: StorePickupStation, as: 'station' },
        { model: Inventory, as: 'inventory' }
      ]
    });

    if (productStations.length === 0) {
      throw new Error(`Product ${productId} is not assigned to any pickup stations.`);
    }

    let remainingNeeded = requiredQty;
    const allocations = [];
    let totalFetchRate = 0;

    // Case B: Customer Pickup (Priority: Chosen Station)
    if (chosenStationId) {
      const chosen = productStations.find(ps => ps.pickupStationId === chosenStationId);
      if (chosen) {
        const stock = chosen.inventory ? (chosen.inventory.quantityOnHand - chosen.inventory.quantityReserved) : 0;
        const taken = Math.min(stock, remainingNeeded);
        if (taken > 0) {
          allocations.push({
            pickupStationId: chosen.pickupStationId,
            quantity: taken,
            stationName: chosen.station.name
          });
          remainingNeeded -= taken;
        }
      }
    }

    // Case A & B (fallback): Logistics or remaining need
    if (remainingNeeded > 0) {
      const sortedStations = this._sortStationsByProximity(productStations, receiverAddress);

      for (const ps of sortedStations) {
        if (remainingNeeded <= 0) break;

        const alreadyAllocated = allocations.find(a => a.pickupStationId === ps.pickupStationId);
        const stock = ps.inventory ? (ps.inventory.quantityOnHand - ps.inventory.quantityReserved) : 0;

        const available = alreadyAllocated ? 0 : stock;
        const taken = Math.min(available, remainingNeeded);

        if (taken > 0) {
          allocations.push({
            pickupStationId: ps.pickupStationId,
            quantity: taken,
            stationName: ps.station.name
          });
          remainingNeeded -= taken;

          if (receiverAddress) {
            totalFetchRate += this._calculateFetchRate(ps.station, receiverAddress, taken);
          }
        }
      }
    }

    if (remainingNeeded > 0) {
      throw new Error(`Insufficient total stock across all stations. Missing: ${remainingNeeded}`);
    }

    return {
      allocations,
      fetchRate: receiverAddress ? totalFetchRate : 0 // 0 for customer pickup
    };
  }

  _sortStationsByProximity(stations, receiverAddress) {
    if (!receiverAddress) return stations;

    // Placeholder for real distance calculation (e.g. via Google Maps or ShipBubble)
    // For now, we just sort by a mock distance or keep as is.
    return stations.sort((a, b) => {
      const distA = this._mockDistance(a.station, receiverAddress);
      const distB = this._mockDistance(b.station, receiverAddress);
      return distA - distB;
    });
  }

  _mockDistance(station, address) {
    // Mock: distance is based on city match (0 if same city, 10 if different)
    // In production, use coordinates and Haversine formula or an API.
    return station.address.includes(address.city) ? 0 : 10;
  }

  _calculateFetchRate(station, address, qty) {
    // Mock fetch rate: base rate * distance * qty
    const dist = this._mockDistance(station, address);
    return dist * 100 * qty;
  }
}

module.exports = new SourcingService();
