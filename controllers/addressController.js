const addressService = require("../services/addressServices");

exports.create = async (req, res) => {
  try {
    // Normalize common frontend field names (line1/line2) to backend model fields
    const normalizedBody = { ...(req.body || {}) };
    if (!normalizedBody.addressLine1 && (req.body?.line1 || req.body?.line_1)) {
      normalizedBody.addressLine1 = req.body.line1 || req.body.line_1;
    }
    if (!normalizedBody.addressLine2 && (req.body?.line2 || req.body?.line_2)) {
      normalizedBody.addressLine2 = req.body.line2 || req.body.line_2;
    }

    // Basic validation to avoid DB notNull violations
    const required = ['addressLine1', 'city', 'state', 'country'];
    const missing = required.filter((k) => !normalizedBody || normalizedBody[k] === undefined || normalizedBody[k] === null || String(normalizedBody[k]).trim() === '');
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required address fields: ${missing.join(', ')}`,
      });
    }

    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const address = await addressService.createAddress(userId, normalizedBody);

    return res.status(201).json({
      success: true,
      data: address,
    });
  } catch (err) {
    // Distinguish validation-like errors from server errors
    if (err.name === 'SequelizeValidationError' || /addressLine1/i.test(err.message)) {
      return res.status(400).json({ success: false, message: err.message });
    }

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