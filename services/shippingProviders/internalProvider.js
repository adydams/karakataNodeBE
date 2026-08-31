const { ShipmentEvent } = require("../../models");
const shippingPriceCalculator = require("../shippingPriceCalculator");

/**
 * InternalProvider handles shipments managed by the Karakata fleet.
 */
class InternalProvider {
  async track(shipmentId) {
    const events = await ShipmentEvent.findAll({
      where: { shipmentId },
      order: [['createdAt', 'DESC']],
    });

    if (!events.length) {
      return {
        status: 'pending',
        trackingUrl: null,
        events: [],
      };
    }

    return {
      status: events[0].status,
      trackingUrl: null, // Internal tracking is handled via our own UI
      events: events.map(e => ({
        status: e.status,
        location: e.location,
        note: e.note,
        timestamp: e.createdAt,
      })),
    };
  }

  async getQuote(origin, destination, weight) {
    const price = await shippingPriceCalculator.calculateInternalPrice(
      origin,
      destination,
      weight
    );

    return {
      price,
      provider: 'internal',
      estimatedDays: '1-2',
    };
  }
}

module.exports = new InternalProvider();
