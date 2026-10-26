const { Shipment, ShipmentEvent } = require("../../models");
const shippingPriceCalculator = require("../shippingPriceCalculator");

/**
 * InternalProvider handles shipments managed by the Karakata fleet.
 */
class InternalProvider {
  async track(shipmentId) {
    const shipment = await Shipment.findByPk(shipmentId, {
      attributes: ["status", "trackingUrl"],
    });
    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const events = await ShipmentEvent.findAll({
      where: { shipmentId },
      order: [['createdAt', 'DESC']],
    });

    return {
      status: shipment.status || 'pending',
      trackingUrl: shipment.trackingUrl || null,
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
