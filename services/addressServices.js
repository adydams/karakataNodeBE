// services/addressServices.js
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapter");
const { User, Address } = require("../models");


exports.createAddress = async (userId, data) => {
  const {
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  } = data;
  console.log("Creating address with data:", data);
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

  const result = await ShipBubbleAdapter.validateAddress({
    name: `${user.firstName  || ""} ${user.lastname || ""}`.trim()  || user.fullName || "John Doe",
    email: user.email,
    phone: user.phone || "",
    address: fullAddress,
  });
console.log("ShipBubble validation result:", result.address_code);
  await address.update({
    shipbubbleAddressCode: result.address_code,
    // longitude: result.longitude,
    // latitude: result.latitude,
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

  await address.update({
    addressLine1: line1 ?? address.addressLine1,
    addressLine2: line2 ?? address.addressLine2,
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

  const result = await ShipBubbleAdapter.validateAddress({
    name: user.name || user.fullName || "Customer",
    email: user.email,
    phone: user.phone || "",
    address: fullAddress,
  });

  await address.update({
    shipbubbleAddressCode: result.address_code,
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
