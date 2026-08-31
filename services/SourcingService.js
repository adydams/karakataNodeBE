const { Inventory, StorePickupStation } = require("../models");

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
    const productStations = await Inventory.findAll({
      where: { productId, isDeleted: false },
      include: [
        {
          model: StorePickupStation,
          as: "pickupStation",
          required: true,
          where: { isDeleted: false },
        },
      ],
    });

    if (productStations.length === 0) {
      throw new Error(`Product ${productId} is not assigned to any pickup stations.`);
    }

    let remainingNeeded = requiredQty;
    const allocations = [];
    let totalFetchRate = 0;

    // Case B: Customer Pickup (Priority: Chosen Station)
    if (chosenStationId) {
      const chosen = productStations.find((ps) => ps.pickupStationId === chosenStationId);
      if (chosen) {
        const stock = chosen.quantityOnHand - chosen.quantityReserved;
        const taken = Math.min(stock, remainingNeeded);
        if (taken > 0) {
          allocations.push({
            pickupStationId: chosen.pickupStationId,
            quantity: taken,
            stationName: chosen.pickupStation.name,
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
        const stock = ps.quantityOnHand - ps.quantityReserved;

        const available = alreadyAllocated ? 0 : stock;
        const taken = Math.min(available, remainingNeeded);

        if (taken > 0) {
          allocations.push({
            pickupStationId: ps.pickupStationId,
            quantity: taken,
            stationName: ps.pickupStation.name
          });
          remainingNeeded -= taken;

          if (receiverAddress) {
            totalFetchRate += this._calculateFetchRate(ps.pickupStation, receiverAddress, taken);
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
      const distA = this._mockDistance(a.pickupStation, receiverAddress);
      const distB = this._mockDistance(b.pickupStation, receiverAddress);
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
