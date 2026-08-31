const shipBubbleProvider = require("./shippingProviders/shipBubbleProvider");
const internalProvider = require("./shippingProviders/internalProvider");

/**
 * ShippingManager routes shipping requests to the appropriate provider.
 */
class ShippingManager {
  constructor() {
    this.providers = {
      shipbubble: shipBubbleProvider,
      internal: internalProvider,
    };
  }

  /**
   * Returns the provider instance based on the provider name.
   * @param {string} providerName - 'shipbubble' or 'internal'
   */
  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Shipping provider '${providerName}' is not supported.`);
    }
    return provider;
  }

  /**
   * Tracks a shipment using the appropriate provider.
   * @param {Object} shipment - The shipment record from DB
   */
  async trackShipment(shipment) {
    const provider = this.getProvider(shipment.provider);

    if (shipment.provider === 'internal') {
      return provider.track(shipment.id);
    } else {
      return provider.track(shipment.providerOrderId);
    }
  }

  /**
   * Gets shipping quotes from all available providers.
   * @param {Object} origin - { latitude, longitude }
   * @param {Object} destination - { latitude, longitude }
   * @param {number} weight - Total weight in kg
   * @returns {Promise<Array>} List of quotes
   */
  async getAllQuotes(origin, destination, weight) {
    const quotes = [];

    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const quote = await provider.getQuote(origin, destination, weight);
        quotes.push(quote);
      } catch (error) {
        console.error(`Error getting quote from ${name}:`, error);
      }
    }

    return quotes;
  }
}

module.exports = new ShippingManager();
