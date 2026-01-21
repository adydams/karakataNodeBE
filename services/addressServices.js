// services/addressServices.js
const Address = require("../models/addressModel");

exports.createAddress = async (userId, data) => {
  return await Address.create({
    userId,
    ...data,
  });
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

  await address.update(data);
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
