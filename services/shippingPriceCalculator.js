const { SystemSetting } = require("../models");

/**
 * ShippingPriceCalculator handles the dynamic pricing logic for internal shipping.
 * Formula: Base Fee + (Distance * PricePerKm) + (Weight * PricePerKg)
 */
class ShippingPriceCalculator {
  /**
   * Calculates the distance between two points using the Haversine formula.
   * @param {number} lat1 - Latitude of origin
   * @param {number} lon1 - Longitude of origin
   * @param {number} lat2 - Latitude of destination
   * @param {number} lon2 - Longitude of destination
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371; // Radius of the earth in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static _toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Calculates the total shipping price for an internal delivery.
   * @param {Object} origin - { latitude, longitude }
   * @param {Object} destination - { latitude, longitude }
   * @param {number} totalWeightKg - Total weight of all items in kg
   * @returns {Promise<number>} Calculated price
   */
  async calculateInternalPrice(origin, destination, totalWeightKg) {
    const settings = await SystemSetting.findOne();
    if (!settings) {
      throw new Error("System settings not configured for internal shipping.");
    }

    const baseFee = parseFloat(settings.internalBaseFee || 0);
    const pricePerKm = parseFloat(settings.internalPricePerKm || 0);
    const pricePerKg = parseFloat(settings.internalPricePerKg || 0);

    // Fallback: If coordinates are missing, return a reasonable flat estimate
    // instead of failing. (Base Fee + a small distance/weight buffer)
    if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
      return baseFee + 500 + (totalWeightKg * pricePerKg);
    }

    const distance = ShippingPriceCalculator.calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    const distanceCost = distance * pricePerKm;
    const weightCost = totalWeightKg * pricePerKg;

    return baseFee + distanceCost + weightCost;
  }
}

module.exports = new ShippingPriceCalculator();
