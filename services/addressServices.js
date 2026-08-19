// services/addressServices.js
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapterSafe");
const { User, Address } = require("../models");


exports.createAddress = async (userId, data) => {
  // Accept frontend variants (line1/line2) and normalize
  const normalized = { ...(data || {}) };
  if (!normalized.addressLine1 && (data?.line1 || data?.line_1)) normalized.addressLine1 = data.line1 || data.line_1;
  if (!normalized.addressLine2 && (data?.line2 || data?.line_2)) normalized.addressLine2 = data.line2 || data.line_2;

  const {
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  } = normalized;

  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  // Build full address string for ShipBubble validation
  const fullAddress = [
    addressLine1,
    addressLine2,
    city,
    state,
    country,
  ]
    .filter(Boolean)
    .join(", ");

  // Validate with ShipBubble first — address must be registered at ShipBubble to be considered valid
  let validationResult;
  try {
    const latitude = normalized.latitude !== undefined ? Number(normalized.latitude) : undefined;
    const longitude = normalized.longitude !== undefined ? Number(normalized.longitude) : undefined;

    validationResult = await ShipBubbleAdapter.validateAddress({
      name: user.name || "John Doe",
      email: user.email,
      phone: user.phone || "",
      address: fullAddress,
      latitude,
      longitude,
    });
  } catch (err) {
    // Bubble up adapter errors so the controller can return a helpful message to the frontend
    console.error('ShipBubble validation failed:', err.message || err);
    throw new Error(err.message || 'ShipBubble address validation failed');
  }

  if (!validationResult || !validationResult.address_code) {
    throw new Error('Address is not valid according to ShipBubble. Please provide a correct address.');
  }

  // Create address with the returned shipbubbleAddressCode
  const address = await Address.create({
    userId,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    shipbubbleAddressCode: validationResult.address_code,
  });

  return address;
};

exports.getAddressesByUser = async (userId) => {
  return await Address.findAll({
    where: { userId, isDeleted: false },
    order: [["createdAt", "DESC"]],
  });
};

exports.getAddressById = async (id, userId) => {
  return await Address.findOne({
    where: { id, userId, isDeleted: false },
  });
};

exports.updateAddress = async (id, userId, data) => {
  const address = await Address.findOne({
    where: { id, userId, isDeleted: false },
  });

  if (!address) return null;

  const {
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  } = data;

  // Compute the new full address values (don't persist shipbubbleAddressCode until validation succeeds)
  const newAddressLine1 = addressLine1 ?? address.addressLine1;
  const newAddressLine2 = addressLine2 ?? address.addressLine2;
  const newCity = city ?? address.city;
  const newState = state ?? address.state;
  const newCountry = country ?? address.country;

  const fullAddress = [
    newAddressLine1,
    newAddressLine2,
    newCity,
    newState,
    newCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  // Validate with ShipBubble — require address_code to consider update valid
  let validationResult;
  try {
    const latitude = data.latitude !== undefined ? Number(data.latitude) : undefined;
    const longitude = data.longitude !== undefined ? Number(data.longitude) : undefined;

    validationResult = await ShipBubbleAdapter.validateAddress({
      name: user.name || "John Doe",
      email: user.email,
      phone: user.phone || "",
      address: fullAddress,
      latitude,
      longitude,
    });
  } catch (err) {
    console.error('ShipBubble validation failed:', err.message || err);
    throw new Error(err.message || 'ShipBubble address validation failed');
  }

  if (!validationResult || !validationResult.address_code) {
    throw new Error('Address is not valid according to ShipBubble. Please provide a correct address.');
  }

  // All good — persist update with new shipbubbleAddressCode
  await address.update({
    addressLine1: newAddressLine1,
    addressLine2: newAddressLine2,
    city: newCity,
    state: newState,
    postalCode: postalCode ?? address.postalCode,
    country: newCountry,
    shipbubbleAddressCode: validationResult.address_code,
  });

  return address;
};

exports.deleteAddress = async (id, userId) => {
  const address = await Address.findOne({
    where: { id, userId },
  });

  if (!address) return false;

  await address.update({ isDeleted: true });
  return true;
};
