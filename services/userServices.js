// services/userService.js
const { User } = require("../models/userModel");
const { Address } = require("../models/addressModel");

class UserServices {
  getMe(userId) {
    return User.findByPk(userId, { include: [{ model: Address, as: "addresses" }] });
  }

  async updateMe(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    // Protect immutable fields
    delete data.email; delete data.role; delete data.passwordHash;
    await user.update(data);
    return user;
  }

  addAddress(userId, payload) {
    return Address.create({ ...payload, userId });
  }

  async deleteAddress(userId, addressId) {
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) return null;
    await address.destroy();
    return true;
  }
}

module.exports = new UserServices();
