// services/logisticsService.js
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapter");
const { Shipment, Address, Order, User } = require("../models");

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

    const result = await ShipBubbleAdapter.validateAddress({
      name: user.name || user.fullName || "Customer",
      email: user.email,
      phone: user.phone || addr.phone || "",
      address: fullAddress,
    });

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
  }) {
    //   console.log("🔥 ShipBubble Payload:", {
    //   senderAddressCode,
    //   receiverAddressCode,
    //   pickupDate: today,
    //   categoryId,
    //   packageItems,
    //   packageDimension,
    //   serviceType,
    // });
    
    const addr = await Address.findByPk(receiverAddressId);
    if (!addr) throw new Error("Shipping address not found");
    
    console.log("Address record in logistics get rates:", addr.toJSON());
    if (isNaN(addr.shipbubbleAddressCode)) {
      throw new Error("Invalid senderAddressCode");
    }

    let receiverAddressCode = addr.shipbubbleAddressCode;
    if (!receiverAddressCode) {
      const registered = await LogisticsService.validateAndRegisterAddress(receiverAddressId);
      receiverAddressCode = registered.address_code;
    }

    const product = await Product.findByPk(id, {
      include: ["pickupStation"]
    });

    senderAddressCode =
      product.pickupStation.shipbubbleAddressCode;
    
      if (!senderAddressCode) throw new Error("This product's is not available for logistic delivery");
      //give custome store address to go pick it up
      //implement it later, for now just use the pickup station address code

    const today = pickupDate || new Date().toISOString().split("T")[0];

    const ratesData = await ShipBubbleAdapter.fetchRates({
        sender_address_code: Number(senderAddressCode),
        reciever_address_code: Number(receiverAddressCode),

        pickup_date: today,
        category_id: Number(categoryId),

        package_items: packageItems,
        package_dimension: packageDimension,

        service_type: serviceType, // pickup | dropoff
      });

    return ratesData;
    // { request_token, couriers[], cheapest_courier, fastest_courier }
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