// services/shipbubble/shipbubbleAdapter.js
const axios = require("axios");

const BASE_URL = "https://api.shipbubble.com/v1";

function authHeaders() {
  const key = process.env.SHIPBUBBLE_API_KEY;
  if (!key) {
    throw new Error('Missing SHIPBUBBLE_API_KEY in environment');
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

const headers = () => authHeaders();

const ShipBubbleAdapter = {
  async validateAddress({ name, email, phone, address, latitude, longitude }) {
    const payload = { name, email, phone, address };
    if (latitude !== undefined) payload.latitude = latitude;
    if (longitude !== undefined) payload.longitude = longitude;

    try {
      const res = await axios.post(`${BASE_URL}/shipping/address/validate`, payload, { headers: headers() });
      return res.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'ShipBubble validation failed';
      console.error('ShipBubble validateAddress error', err.response?.data || err);
      throw new Error(msg);
    }
  },

  async fetchRates({ senderAddressCode, receiverAddressCode, pickupDate, categoryId, packageItems, packageDimension, serviceType, deliveryInstructions }) {
    const payload = {
      sender_address_code: senderAddressCode,
      receiver_address_code: receiverAddressCode,
      pickup_date: pickupDate,
      category_id: categoryId,
      package_items: packageItems,
      package_dimension: packageDimension,
    };
    if (serviceType) payload.service_type = serviceType;
    if (deliveryInstructions) payload.delivery_instructions = deliveryInstructions;

    try {
      const res = await axios.post(`${BASE_URL}/shipping/fetch_rates`, payload, { headers: headers() });
      if (res.data.status && res.data.status !== 'success') {
        throw new Error(res.data.message || 'ShipBubble fetch rates failed');
      }
      return res.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'ShipBubble fetch rates failed';
      console.error('ShipBubble fetchRates error', err.response?.data || err);
      throw new Error(msg);
    }
  },

  async createShipment({ requestToken, serviceCode, courierId, insuranceCode, isCodLabel }) {
    const payload = { request_token: requestToken, service_code: serviceCode, courier_id: courierId };
    if (insuranceCode) payload.insurance_code = insuranceCode;
    if (isCodLabel !== undefined) payload.is_cod_label = isCodLabel;

    try {
      const res = await axios.post(`${BASE_URL}/shipping/labels`, payload, { headers: headers() });
      if (res.data.status && res.data.status !== 'success') {
        throw new Error(res.data.message || 'ShipBubble create shipment failed');
      }
      return res.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'ShipBubble create shipment failed';
      console.error('ShipBubble createShipment error', err.response?.data || err);
      throw new Error(msg);
    }
  },

  async getCategories() {
    const res = await axios.get(`${BASE_URL}/shipping/labels/categories`, { headers: headers() });
    return res.data.data;
  },

  async getBoxSizes() {
    const res = await axios.get(`${BASE_URL}/shipping/labels/boxes`, { headers: headers() });
    return res.data.data;
  },

  async getCouriers() {
    const res = await axios.get(`${BASE_URL}/shipping/couriers`, { headers: headers() });
    return res.data.data;
  },

  async getWalletBalance() {
    const res = await axios.get(`${BASE_URL}/shipping/wallet/balance`, { headers: headers() });
    return res.data.data;
  },

  async fundWallet(amount) {
    const res = await axios.post(`${BASE_URL}/shipping/wallet/fund`, { amount }, { headers: headers() });
    return res.data.data;
  },
};

module.exports = ShipBubbleAdapter;