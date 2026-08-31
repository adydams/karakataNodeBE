/**
 * ShipBubbleProvider handles integration with ShipBubble API.
 */
class ShipBubbleProvider {
  async track(providerOrderId) {
    // In a real implementation, this would call the ShipBubble API
    // For now, we simulate the API response
    return {
      status: 'in_transit',
      trackingUrl: `https://shipbubble.com/track/${providerOrderId}`,
      events: [
        { status: 'ORDER_RECEIVED', location: 'ShipBubble Hub', note: 'Package received by courier' },
        { status: 'IN_TRANSIT', location: 'On the way', note: 'Package is moving' },
      ],
    };
  }

  async getQuote(origin, destination, weight) {
    // Simulate ShipBubble API quote request
    return {
      price: 2500, // Simulated flat rate for external
      provider: 'shipbubble',
      estimatedDays: '3-5',
    };
  }
}

module.exports = new ShipBubbleProvider();
