// services/logisticsService.js
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapterSafe");
const ShippingPriceCalculator = require("./shippingPriceCalculator");
const { Shipment, Address, Order, User, Product, StorePickupStation } = require("../models");

/**
 * LogisticsService
 *
 * Flow:
 *  1. validateAndRegisterAddress  → gets address_code from ShipBubble
 *  2. getShippingRates            → gets request_token + courier options
 *  3. createShipment              → books a courier, stores Shipment record
 *  4. getShipmentStatus           → reads from DB (updated by webhook or poll)
 */
const LogisticsService = {
  /**
   * Validates a local address with ShipBubble and stores the address_code.
   * Call this when a user saves/updates a shipping address.
   */
  async validateAndRegisterAddress(addressId) {
    const addr = await Address.findByPk(addressId);
    if (!addr) throw new Error("Shipping address not found");

    const fullAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.country]
      .filter(Boolean)
      .join(", ");

    // We need the user's name, email, phone — fetch from user
    const user = await User.findByPk(addr.userId);
    if (!user) throw new Error("User not found for address");

    if (!user.email) {
      throw new Error("User email is required for address validation. Please update your profile email.");
    }

    const result = await ShipBubbleAdapter.validateAddress({
      name: user.name || user.fullName || "Customer",
      email: user.email,
      phone: user.phone || "",
      address: fullAddress,
      code: addr.shipbubbleAddressCode || undefined, // optional, if already registered
    });
    console.log("ShipBubble validation result ******:", result);

    if (!result || !result.address_code) {
      throw new Error("ShipBubble failed to provide an address code for this location. Please check your address details.");
    }

    // Persist the address_code so we don't re-validate every time
    await addr.update({ shipbubbleAddressCode: result.address_code });

    return result;
  },

  /**
   * Fetch shipping rates for an order.
   * senderAddressCode: your store/warehouse ShipBubble address code (from env)
   * Returns couriers array + request_token for booking.
   */
  async getShippingRates({
    receiverAddressId,
    packageItems,   // [{ name, description, unit_weight, unit_amount, quantity }]
    packageDimension, // { length, width, height } CM
    categoryId,
    pickupDate,     // "yyyy-mm-dd", defaults to today
    serviceType,    // "pickup" | "dropoff" | undefined
    senderStationId, // Optional: override sender station
  }) {
    const addr = await Address.findByPk(receiverAddressId);
    if (!addr) throw new Error("Shipping address not found");

    console.log("Address record in logistics get rates:", addr.toJSON());

    let receiverAddressCode = addr.shipbubbleAddressCode;
    if (receiverAddressCode === null || receiverAddressCode === undefined) {
      try {
        const registered = await LogisticsService.validateAndRegisterAddress(receiverAddressId);

        console.log("****** registered Address registered with ShipBubble:", registered);
        receiverAddressCode = registered.address_code;
      } catch (err) {
        throw new Error(`Address validation failed: ${err.message}`);
      }
    }

    if (receiverAddressCode === null || receiverAddressCode === undefined) {
      throw new Error("Recipient address code is required. Please ensure the address is validated with ShipBubble.");
    }

    let senderAddressCode;
    if (senderStationId) {
      
      console.log("Using sender station address code:", senderAddressCode);
      const station = await StorePickupStation.findByPk(senderStationId);
      
      console.log("Using sender station details", station ? station.toJSON() : "Station not found");
      if (!station) throw new Error("Sender station not found");
      senderAddressCode = station.shipbubbleAddressCode;

    } else {
      senderAddressCode = process.env.SHIPBUBBLE_SENDER_ADDRESS_CODE;
      // Fallback: find any StorePickupStation that has a shipbubbleAddressCode set and use that
      if (!senderAddressCode) {
        const { Op } = require('sequelize');
        const fallbackStation = await StorePickupStation.findOne({ where: { shipbubbleAddressCode: { [Op.ne]: null } } });
        if (fallbackStation) senderAddressCode = fallbackStation.shipbubbleAddressCode;
      }
    }

    if (!senderAddressCode) throw new Error("No sender address code available. Please configure SHIPBUBBLE_SENDER_ADDRESS_CODE in .env or register a sender station in the admin.");

    const today = pickupDate || new Date().toISOString().split("T")[0];

    const finalCategoryId = Number(categoryId) || 74794423;

    const normalizedPackageItems = packageItems.map(item => ({
      name: String(item.name),
      description: String(item.description),
      unit_weight: String(item.unit_weight || 0),
      unit_amount: String(item.unit_amount || 0),
      quantity: String(item.quantity || 0),
    }));

    let ratesData = await ShipBubbleAdapter.fetchRates({
        senderAddressCode: Number(senderAddressCode),
        receiverAddressCode: Number(receiverAddressCode),

        pickupDate: today,
        categoryId: Number(finalCategoryId),

        packageItems: normalizedPackageItems,
        packageDimension: packageDimension,

        serviceType: serviceType, // pickup | dropoff
      });

    // Normalize ShipBubble response so frontend and other services always see the same shape
    // Common ShipBubble responses may use different property names; standardize to { request_token, couriers: [{ id, name, fee, estimated_days, service_code }] }
    try {
      const token = ratesData.request_token || ratesData.requestToken || ratesData.requestTokenId || null;
      const rawCouriers = ratesData.couriers || ratesData.data || ratesData.options || [];

      const couriers = (Array.isArray(rawCouriers) ? rawCouriers : Object.values(rawCouriers)).map(c => ({
        id: c.id ?? c.courier_id ?? c.code ?? c.service_code ?? String(c.name || '').toLowerCase(),
        name: c.name || c.courier_name || c.provider || null,
        fee: Number(c.fee ?? c.amount ?? c.price ?? c.shipping_fee ?? c.rate ?? 0),
        estimated_days: c.estimated_days ?? c.eta ?? c.estimated_delivery_days ?? null,
        service_code: c.service_code ?? c.code ?? null,
        raw: c,
      }));

      // --- Add Karakata Internal Fleet Option ---
      try {
        console.log("[Internal Shipping] Starting calculation...");
        const totalWeight = packageItems.reduce((sum, item) => sum + (Number(item.unit_weight || 0) * Number(item.quantity || 0)), 0);
        console.log(`[Internal Shipping] Total weight: ${totalWeight}kg`);

        let origin = null;
        if (senderStationId) {
          const station = await StorePickupStation.findByPk(senderStationId);
          if (station) {
            origin = { latitude: station.latitude, longitude: station.longitude };
            console.log(`[Internal Shipping] Origin (Station ${senderStationId}):`, origin);
          }
        } else {
          const { Op } = require('sequelize');
          const fallbackStation = await StorePickupStation.findOne({ where: { latitude: { [Op.ne]: null } } });
          if (fallbackStation) {
            origin = { latitude: fallbackStation.latitude, longitude: fallbackStation.longitude };
            console.log(`[Internal Shipping] Origin (Fallback Station ${fallbackStation.id}):`, origin);
          } else {
            console.log("[Internal Shipping] No origin station with coordinates found.");
          }
        }

        const destination = { latitude: addr.latitude, longitude: addr.longitude };
        console.log(`[Internal Shipping] Destination:`, destination);

        const internalFee = await ShippingPriceCalculator.calculateInternalPrice(origin, destination, totalWeight);
        console.log(`[Internal Shipping] Calculated Fee: ₦${internalFee}`);

        couriers.unshift({
          id: 'karakata-internal',
          name: 'Karakata Internal Fleet',
          fee: internalFee,
          estimated_days: '1-2',
          service_code: 'INTERNAL',
          raw: { provider: 'internal' }
        });
        console.log(`[Internal Shipping] Successfully added to courier list. Total couriers: ${couriers.length}`);
      } catch (internalErr) {
        console.error('[Internal Shipping] Fatal error during calculation:', internalErr);
      }

      ratesData = { request_token: token, couriers };
    } catch (err) {

      // If normalization fails, return original payload but log the problem
      console.error('Failed to normalize ShipBubble rates response:', err.message || err);
    }

    return ratesData;
  },

  /**
   * Create a shipment after the customer selects a courier.
   * Stores a Shipment record in your DB linked to the order.
   */
  async createShipment({
    orderId,
    requestToken,
    serviceCode,
    courierId,
    courierName,
    shippingFee,
    trackingLevel,
    deliveryEta,
    insuranceCode,
  }) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    // Call ShipBubble — deducts from wallet
    const shipmentData = await ShipBubbleAdapter.createShipment({
      requestToken,
      serviceCode,
      courierId,
      insuranceCode,
    });

    // Save to local DB
    const shipment = await Shipment.create({
      orderId,
      shipbubbleOrderId: shipmentData.order_id,   // e.g. SB-2CF48224272
      courier: courierName || shipmentData.courier?.name,
      serviceCode,
      courierId: String(courierId),
      trackingUrl: shipmentData.tracking_url,
      status: shipmentData.status || "pending",
      shippingFee: shippingFee || shipmentData.payment?.shipping_fee,
      deliveryEta,
      rawResponse: shipmentData,
    });

    // Update order status
    await order.update({ logisticsStatus: "PROCESSING" });

    return shipment;
  },

  /**
   * Get shipment for an order (from local DB).
   */
  async getShipmentByOrderId(orderId) {
    const shipment = await Shipment.findOne({ where: { orderId } });
    if (!shipment) throw new Error("Shipment not found for this order");
    return shipment;
  },

  /**
   * Update shipment status — called by webhook handler or admin.
   */
  async updateShipmentStatus(shipbubbleOrderId, status) {
    const shipment = await Shipment.findOne({ where: { shipbubbleOrderId } });
    if (!shipment) throw new Error("Shipment not found");

    await shipment.update({ status });

    // Mirror to order
    const statusMap = {
      pending: "PROCESSING",
      shipped: "SHIPPED",
      in_transit: "IN_TRANSIT",
      delivered: "DELIVERED",
      failed: "DELIVERY_FAILED",
    };
    if (statusMap[status]) {
      await Order.update(
        { logisticsStatus: statusMap[status] },
        { where: { id: shipment.orderId } }
      );
    }

    return shipment;
  },

  /**
   * Helper — get ShipBubble categories (cached by caller if desired).
   */
  async getCategories() {
    return ShipBubbleAdapter.getCategories();
  },

  /**
   * Helper — get box sizes.
   */
  async getBoxSizes() {
    return ShipBubbleAdapter.getBoxSizes();
  },

  /**
   * Helper — get available couriers.
   */
  async getCouriers() {
    return ShipBubbleAdapter.getCouriers();
  },

  /**
   * Helper — wallet balance.
   */
  async getWalletBalance() {
    return ShipBubbleAdapter.getWalletBalance();
  },
};

module.exports = LogisticsService;
