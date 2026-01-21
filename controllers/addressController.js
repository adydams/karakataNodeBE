// controllers/addressController.js
const AddressService = require("../services/addressServices");

class AddressController {
  async create(req, res) {
    try {
      const userId = req.user.id;
      const address = await AddressService.createAddress(userId, req.body);

      return res.status(201).json({
        success: true,
        message: "Address created successfully",
        address,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getAll(req, res) {
    const userId = req.user.id;
    console.log("Fetching addresses for user:", userId);
    const addresses = await AddressService.getAddressesByUser(userId);
    console.log("Addresses found:", addresses);  
    return res.status(200).json({
      success: true,
      addresses,
    });
  }

  async getOne(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await AddressService.getAddressById(id, userId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      address,
    });
  }

  async update(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await AddressService.updateAddress(id, userId, req.body);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated",
      address,
    });
  }

  async delete(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await AddressService.deleteAddress(id, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted",
    });
  }
}

module.exports = new AddressController();
