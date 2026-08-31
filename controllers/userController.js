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

exports.getActivity = async (req, res) => {
  try {
    const activity = await userService.getActivity(req.user.id);
    res.json({ success: true, data: activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }
    const pictureUrl = req.file.path;
    const user = await userService.updateProfilePicture(req.user.id, pictureUrl);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: { profilePicture: pictureUrl }, message: "Profile picture updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
