const authService = require("../services/authServices");
const passport = require("passport");
const Role = require("../models/roleModel");
const User = require("../models/userModel");
const { Op } = require("sequelize");

exports.filterAdmins = async (req, res) => {
  try {
    const {
      roleName,
      name,
      phone,
      email,
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (page - 1) * limit;
    const filters = {};

    if (name) filters.name = { [Op.like]: `%${name}%` };
    if (phone) filters.phone = { [Op.like]: `%${phone}%` };
    if (email) filters.email = { [Op.like]: `%${email}%` };

    const include = [
      {
        model: Role,
        as: "role",
        attributes: ["id", "name", "description"],
        ...(roleName
          ? { where: { name: { [Op.like]: `%${roleName}%` } }, required: true }
          : { required: false }),
      },
    ];

    const { rows, count } = await User.findAndCountAll({
      where: filters,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      totalRecords: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (err) {
    console.error("❌ Filter error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getAllAdmins = async (req, res) => {
  try {
    const {
      roleName = "Admin", // default role filter
      name,
      phone,
      email,
      page = 1,
      limit = 10,
    } = req.query;
     console.log("req.query.limit")
    console.log(req.query.limit)
    const offset = (page - 1) * limit;

    // Build filters dynamically
    const filters = {};
    if (name) filters.name = { [Op.like]: `%${name}%` };
    if (phone) filters.phone = { [Op.like]: `%${phone}%` };
    if (email) filters.email = { [Op.like]: `%${email}%` };

    // Include Role model and apply role filter if provided
    const include = [
      {
        model: Role,
        as: "role",
        attributes: ["id", "role", "description"],
        ...(roleName
          ? { where: { role: { [Op.like]: `%${roleName}%` } }, required: true }
          : { required: false }),
      },
    ];

    // Query users with pagination and filters
    const { rows, count } = await User.findAndCountAll({
      where: filters,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      totalRecords: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (err) {
    console.error("❌ Error fetching admins:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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


// ✅ Get all Admins with pagination and role info
exports.getAllAdmins = async (req, res) => {

  try {
    
    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Fetch only users with "Admin" or "SystemAdmin" roles
    const admins = await User.findAndCountAll({
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
          where: { name: ["Admin", "SystemAdmin"] }, // ✅ Optional filter
        },
      ],
      attributes: { exclude: ["passwordHash"] }, // ✅ Hide password
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    // Pagination metadata
    const totalPages = Math.ceil(admins.count / limit);

    res.json({
      success: true,
      currentPage: page,
      totalPages,
      totalAdmins: admins.count,
      admins: admins.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching admins:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ✅ Get Admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await authService.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update Admin info
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedUser = await authService.updateUser(id, updates);
    res.json({ success: true, message: "Admin updated successfully", user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Update Admin role
exports.updateAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const roleRecord = await Role.findOne({ where: { name: role } });
    if (!roleRecord) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const updatedUser = await authService.updateUser(id, { roleId: roleRecord.id });
    res.json({ success: true, message: "Admin role updated successfully", user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Activate / Deactivate Admin
exports.updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedUser = await authService.updateUser(id, { isActive });
    res.json({
      success: true,
      message: `Admin account ${isActive ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Delete Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await authService.deleteUser(id);
    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
