const authService = require("../services/authServices");
const passport = require("passport");
const Role = require("../models/roleModel");


exports.Adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });
    res.json({ success: true, user, token });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};


exports.onboardAdmin = async (req, res) => {
  try {
    console.log("req.user.roleName")
    console.log(req.user.role)
    // ✅ Check SuperAdmin permission based on role name
    if (!req.user || req.user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only SuperAdmin can onboard Admin users.",
      });
    }

    const { name, email, phone } = req.body;
    const staticPassword = "Admin@123";

    // ✅ Fetch the Admin roleId from the database
    const adminRole = await Role.findOne({ where: { name: "Admin" } });
    if (!adminRole) {
      return res.status(404).json({
        success: false,
        message: "Admin role not found. Please seed roles first.",
      });
    }

    // ✅ Register the admin user using the Admin roleId
    const { user, token } = await authService.register({
      name,
      email,
      phone,
      password: staticPassword,
      roleId: adminRole.id, // Use UUID roleId
    });

    res.status(201).json({
      success: true,
      message: "Admin user onboarded successfully",
      user,
      token,
    });
  } catch (err) {
    console.error("❌ Onboarding error:", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


exports.me = async (req, res) => {
  try {
    const user = await authService.getById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
