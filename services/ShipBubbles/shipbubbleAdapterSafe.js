const axios = require("axios");

const BASE_URL = "https://api.shipbubble.com/v1";

function shipbubbleHeaders() {
  const key = process.env.SHIPBUBBLE_API_KEY;
  if (!key) {
    throw new Error('Missing SHIPBUBBLE_API_KEY in environment');
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

const ShipBubbleAdapterSafe = {
  async validateAddress({ name, email, phone, address, latitude, longitude }) {
    const payload = { name, email, phone, address };
    // Only include coordinates when they are usable numbers — null/undefined
    // values must be omitted so ShipBubble geocodes from the address text.
    if (latitude !== undefined && latitude !== null && Number.isFinite(Number(latitude))) {
      payload.latitude = Number(latitude);
    }
    if (longitude !== undefined && longitude !== null && Number.isFinite(Number(longitude))) {
      payload.longitude = Number(longitude);
    }

    try {
      const res = await axios.post(`${BASE_URL}/shipping/address/validate`, payload, { headers: shipbubbleHeaders() });
      // ShipBubble returns { status, data: { address_code, ... } } on success
      return res.data.data;
    } catch (err) {
      // Surface ShipBubble error message when available
      const msg = err.response?.data?.message || err.message || 'ShipBubble validation failed';
      console.error('ShipBubble validateAddress error', err.response?.data || err);
      throw new Error(msg);
    }
  },

  async fetchRates({ senderAddressCode, receiverAddressCode, pickupDate, categoryId, packageItems, packageDimension, serviceType, deliveryInstructions }) {
    const payload = {
      sender_address_code: senderAddressCode,
      reciever_address_code: receiverAddressCode,
      pickup_date: pickupDate,
      category_id: categoryId,
      package_items: packageItems,
      package_dimension: packageDimension,
    };
    if (serviceType) payload.service_type = serviceType;
    if (deliveryInstructions) payload.delivery_instructions = deliveryInstructions;

    console.log('Sending to ShipBubble fetch_rates:', JSON.stringify(payload, null, 2));

    try {
      const res = await axios.post(`${BASE_URL}/shipping/fetch_rates`, payload, {
        headers: shipbubbleHeaders(),
      });
      if (res.data.status && res.data.status !== 'success') {
        throw new Error(res.data.message || 'ShipBubble fetch_rates failed');
      }
      return res.data.data;
    } catch (err) {
      console.error('ShipBubble fetchRates error', err.response?.data || err);
      const msg = err.response?.data?.message || err.message || 'ShipBubble fetch rates failed';
      throw new Error(msg);
    }
  },

  async createShipment({ requestToken, serviceCode, courierId, insuranceCode, isCodLabel }) {
    const payload = { request_token: requestToken, service_code: serviceCode, courier_id: courierId };
    if (insuranceCode) payload.insurance_code = insuranceCode;
    if (isCodLabel !== undefined) payload.is_cod_label = isCodLabel;

    try {
      const res = await axios.post(`${BASE_URL}/shipping/labels`, payload, { headers: shipbubbleHeaders() });
      if (res.data.status && res.data.status !== 'success') throw new Error(res.data.message || 'ShipBubble create shipment failed');
      return res.data.data;
    } catch (err) {
      console.error('ShipBubble createShipment error', err.response?.data || err);
      const msg = err.response?.data?.message || err.message || 'ShipBubble create shipment failed';
      throw new Error(msg);
    }
  },

  async fetchReturnRates({ orderId, pickupDate, deliveryInstructions, senderPhone, receiverPhone }) {
    const payload = { pickup_date: pickupDate };
    if (deliveryInstructions) payload.delivery_instructions = deliveryInstructions;
    if (senderPhone) payload.sender_phone = senderPhone;
    if (receiverPhone) payload.reciever_phone = receiverPhone;

    try {
      const res = await axios.post(
        `${BASE_URL}/shipping/returns/${encodeURIComponent(orderId)}/fetch_rates`,
        payload,
        { headers: shipbubbleHeaders() }
      );
      if (res.data.status && res.data.status !== "success") {
        throw new Error(res.data.message || "ShipBubble return rates failed");
      }
      return res.data.data;
    } catch (err) {
      console.error("ShipBubble fetchReturnRates error", err.response?.data || err);
      throw new Error(err.response?.data?.message || err.message || "ShipBubble return rates failed");
    }
  },

  async getCategories() {
    const res = await axios.get(`${BASE_URL}/shipping/labels/categories`, { headers: shipbubbleHeaders() });
    return res.data.data;
  },

  async getBoxSizes() {
    const res = await axios.get(`${BASE_URL}/shipping/labels/boxes`, { headers: shipbubbleHeaders() });
    return res.data.data;
  },

  async getCouriers() {
    const res = await axios.get(`${BASE_URL}/shipping/couriers`, { headers: shipbubbleHeaders() });
    return res.data.data;
  },

  async getWalletBalance() {
    const res = await axios.get(`${BASE_URL}/shipping/wallet/balance`, { headers: shipbubbleHeaders() });
    return res.data.data;
  },

  async fundWallet(amount) {
    const res = await axios.post(`${BASE_URL}/shipping/wallet/fund`, { amount }, { headers: shipbubbleHeaders() });
    return res.data.data;
  },

  async cancelShipment(orderId) {
    if (!orderId) throw new Error("ShipBubble order ID is required");
    try {
      const res = await axios.post(`${BASE_URL}/shipping/labels/cancel/${orderId}`, {}, { headers: shipbubbleHeaders() });
      if (res.data?.status !== "success") {
        throw new Error(res.data.message || 'ShipBubble cancel shipment failed');
      }
      return {
        confirmed: true,
        status: res.data.status,
        message: res.data.message || "Shipment successfully cancelled",
      };
    } catch (err) {
      console.error('ShipBubble cancelShipment error', err.response?.data || err);
      const msg = err.response?.data?.message || err.message || 'ShipBubble cancel shipment failed';
      throw new Error(msg);
    }
  },
};

module.exports = ShipBubbleAdapterSafe;
