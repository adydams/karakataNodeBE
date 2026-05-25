// services/shipbubble/shipbubbleAdapter.js
const axios = require("axios");

const BASE_URL = "https://api.shipbubble.com/v1";

const headers = () => ({
  Authorization: `Bearer ${process.env. SHIPBUBBLE_API_KEY}`,
  "Content-Type": "application/json",
});

const ShipBubbleAdapter = {
  /**
   * STEP 1 — Validate & register an address with ShipBubble.
   * Returns address_code used in all subsequent calls.
   */
  async validateAddress({ name, email, phone, address, latitude, longitude }) {

    console.log("🔥 ShipBubble Validate Address Payload:", { name, email, phone, address, latitude, longitude });
    const payload = { name, email, phone, address };
    if (latitude) payload.latitude = latitude;
    if (longitude) payload.longitude = longitude;

    try {
      //console.log("🔥 ShipBubble Validate Address Request:", headers());
      const res = await axios.post(
        `${BASE_URL}/shipping/address/validate`,
    payload,
    { headers: headers() }
  );
  console.log("🔥 ShipBubble Validate Address Response:", res.data.data);
  return res.data.data; // { address_code, formatted_address, city, state, ... }
} catch (err) {
  console.log("❌ ShipBubble Error Response:", err.response?.data);
  console.log("❌ Status:", err.response?.status);

  throw new Error(
    err.response?.data?.message || "ShipBubble validation failed"
  );
}

    if (res.data.status !== "success") {
      throw new Error(`ShipBubble address validation failed: ${res.data.message}`);
    }
    return res.data.data; // { address_code, formatted_address, city, state, ... }
  },

  /**
   * STEP 2 — Fetch shipping rates.
   * Returns request_token + array of couriers (cheapest, fastest, best_value).
   */
  async fetchRates({
    senderAddressCode,
    receiverAddressCode,
    pickupDate,
    categoryId,
    packageItems,
    packageDimension,
    serviceType, // "pickup" | "dropoff"
    deliveryInstructions,
  }) {
    const payload = {
      sender_address_code: senderAddressCode,
      reciever_address_code: receiverAddressCode,
      pickup_date: pickupDate, // "yyyy-mm-dd"
      category_id: categoryId,
      package_items: packageItems, // [{ name, description, unit_weight, unit_amount, quantity }]
      package_dimension: packageDimension, // { length, width, height } in CM
    };
    if (serviceType) payload.service_type = serviceType;
    if (deliveryInstructions) payload.delivery_instructions = deliveryInstructions;

    const res = await axios.post(`${BASE_URL}/shipping/fetch_rates`, payload, {
      headers: headers(),
    });

    if (res.data.status !== "success") {
      throw new Error(`ShipBubble fetch rates failed: ${res.data.message}`);
    }
    return res.data.data; // { request_token, couriers[], cheapest_courier, fastest_courier }
  },

  /**
   * STEP 3 — Create shipment (book courier, deducts from ShipBubble wallet).
   * Returns order_id (SB-XXXXX), tracking_url, courier details.
   */
  async createShipment({ requestToken, serviceCode, courierId, insuranceCode, isCodLabel }) {
    const payload = {
      request_token: requestToken,
      service_code: serviceCode,
      courier_id: courierId,
    };
    if (insuranceCode) payload.insurance_code = insuranceCode;
    if (isCodLabel !== undefined) payload.is_cod_label = isCodLabel;

    const res = await axios.post(`${BASE_URL}/shipping/labels`, payload, {
      headers: headers(),
    });

    if (res.data.status !== "success") {
      throw new Error(`ShipBubble create shipment failed: ${res.data.message}`);
    }
    return res.data.data; // { order_id, courier, status, tracking_url, payment, items, ... }
  },

  /**
   * Get available package categories.
   */
  async getCategories() {
    const res = await axios.get(`${BASE_URL}/shipping/labels/categories`, {
      headers: headers(),
    });
    return res.data.data;
  },

  /**
   * Get available package box sizes.
   */
  async getBoxSizes() {
    const res = await axios.get(`${BASE_URL}/shipping/labels/boxes`, {
      headers: headers(),
    });
    return res.data.data;
  },

  /**
   * Get available couriers.
   */
  async getCouriers() {
    const res = await axios.get(`${BASE_URL}/shipping/couriers`, {
      headers: headers(),
    });
    return res.data.data;
  },

  /**
   * Get ShipBubble wallet balance.
   */
  async getWalletBalance() {
    const res = await axios.get(`${BASE_URL}/shipping/wallet/balance`, {
      headers: headers(),
    });
    return res.data.data; // { balance, currency }
  },

  /**
   * Fund ShipBubble wallet (production only).
   */
  async fundWallet(amount) {
    const res = await axios.post(
      `${BASE_URL}/shipping/wallet/fund`,
      { amount },
      { headers: headers() }
    );
    return res.data.data; // { payment_url }
  },
};

module.exports = ShipBubbleAdapter;