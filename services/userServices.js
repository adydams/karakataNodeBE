// services/userService.js
const User = require("../models/userModel");
const Address = require("../models/addressModel");

class UserServices {
  getMe(userId) {
    const { Permission } = require("../models");
    return User.findByPk(userId, {
      include: [
        { model: Address, as: "addresses" },
        {
          model: require("../models").Role,
          as: "role",
          include: [{
            model: Permission,
            as: "permissions",
            attributes: ["id", "name", "description"],
          }],
        },
      ],
    });
  }

  async updateMe(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    // Protect immutable fields
    delete data.email; delete data.role; delete data.passwordHash;
    await user.update(data);
    return user;
  }

  async updateProfilePicture(userId, pictureUrl) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    await user.update({ profilePicture: pictureUrl });
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

  async getActivity(userId) {
    const { AuditLog } = require("../models");
    return AuditLog.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 10
    });
  }
}

module.exports = new UserServices();
