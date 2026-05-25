const addressService = require("../services/addressServices");

exports.create = async (req, res) => {
  try {
     console.log("Created address:, Im here");
    const userId = req.user.id;

    const address = await addressService.createAddress(userId, req.body);
   
    return res.status(201).json({
      success: true,
      data: address,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await addressService.getAddressesByUser(userId);

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getOne = async (req, res) => {
  try {
    const userId = req.user.id;
    const address = await addressService.getAddressById(req.params.id, userId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: address,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user.id;

    const address = await addressService.updateAddress(
      req.params.id,
      userId,
      req.body
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: address,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;

    const deleted = await addressService.deleteAddress(req.params.id, userId);

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
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};