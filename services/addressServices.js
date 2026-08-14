// services/addressServices.js
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapter");
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

  console.log("Creating address with data:", normalized);

  const address = await Address.create({
    userId,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  });

  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  const fullAddress = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Call ShipBubble adapter but do not let its failures block address creation
  try {
    const result = await ShipBubbleAdapter.validateAddress({
      name: `${user.firstName  || ""} ${user.lastname || ""}`.trim()  || user.fullName || "John Doe",
      email: user.email,
      phone: user.phone || "",
      address: fullAddress,
    });

    if (result && result.address_code) {
      await address.update({
        shipbubbleAddressCode: result.address_code,
      });
    }
  } catch (err) {
    console.error('ShipBubble validation failed:', err.message || err);
  }
 
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

  await address.update({
    addressLine1: addressLine1 ?? address.addressLine1,
    addressLine2: addressLine2 ?? address.addressLine2,
    city: city ?? address.city,
    state: state ?? address.state,
    postalCode: postalCode ?? address.postalCode,
    country: country ?? address.country,
    shipbubbleAddressCode: null,
  });

  const user = await User.findByPk(userId);

  const fullAddress = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  // ShipBubble validation should not crash the update; handle errors gracefully
  try {
    const result = await ShipBubbleAdapter.validateAddress({
      name: user.name || user.fullName || "Customer",
      email: user.email,
      phone: user.phone || "",
      address: fullAddress,
    });

    if (result && result.address_code) {
      await address.update({ shipbubbleAddressCode: result.address_code });
    }
  } catch (err) {
    // Log adapter error but don't fail the request
    console.error('ShipBubble validation failed:', err.message || err);
  }

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
