// controllers/userController.js
const userService = require("../services/userServices");

exports.getProfile = async (req, res) => {
  const me = await userService.getMe(req.user.id);
  if (!me) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: me });
};

exports.updateProfile = async (req, res) => {
  const me = await userService.updateMe(req.user.id, req.body);
  if (!me) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: me });
};

exports.addAddress = async (req, res) => {
  const addr = await userService.addAddress(req.user.id, req.body);
  res.status(201).json({ success: true, data: addr });
};

exports.deleteAddress = async (req, res) => {
  const ok = await userService.deleteAddress(req.user.id, req.params.addressId);
  if (!ok) return res.status(404).json({ success: false, message: "Address not found" });
  res.json({ success: true, message: "Address deleted" });
};
