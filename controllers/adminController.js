const authService = require("../services/authServices");
const passport = require("passport");
const Role = require("../models/roleModel");
const User = require("../models/userModel");
const { Op } = require("sequelize");
const auditService = require("../services/auditService");
const SystemSetting = require("../models/systemSettingModel");

exports.filterAdmins = async (req, res) => {
  try {
    const { roleName, name, phone, email, page = 1, limit = 10 } = req.query;
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
    const { roleName = "Admin", name, phone, email, page = 1, limit = 10 } = req.query;
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
    console.error("❌ Error fetching admins:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.Adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password, isAdminLogin: true });

    if (result.mustVerifyAccount) {
      return res.status(200).json({
        success: true,
        mustVerifyAccount: true,
        userId: result.userId,
        email: result.email
      });
    }

    return res.status(200).json({
      success: true,
      user: result.user,
      token: result.token,
      mustVerifyAccount: false
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

exports.onboardAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const adminRole = await Role.findOne({ where: { name: "Admin" } });
    if (!adminRole) {
      return res.status(404).json({
        success: false,
        message: "Admin role not found. Please seed roles first.",
      });
    }

    const { user, token } = await authService.register({
      name,
      email,
      phone,
      password: password,
      roleId: adminRole.id,
    });

    await auditService.log({
      userId: req.user?.id,
      action: "ONBOARD_ADMIN",
      entityType: "User",
      entityId: user.id,
      newValue: { name, email, phone },
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

exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await authService.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name || null,
      permissions: user.role?.permissions || [],
      isActive: user.isActive,
      phone: user.phone,
      profilePicture: user.profilePicture,
      department: user.department,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({ success: true, user: formattedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const oldUser = await User.findByPk(id);
    const updatedUser = await authService.updateUser(id, updates);

    await auditService.log({
      userId: req.user?.id,
      action: "UPDATE_ADMIN",
      entityType: "User",
      entityId: id,
      oldValue: oldUser,
      newValue: updatedUser,
    });

    res.json({ success: true, message: "Admin updated successfully", user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const roleRecord = await Role.findOne({ where: { name: role } });
    if (!roleRecord) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const oldUser = await User.findByPk(id);
    const updatedUser = await authService.updateUser(id, { roleId: roleRecord.id });

    await auditService.log({
      userId: req.user?.id,
      action: "UPDATE_ADMIN_ROLE",
      entityType: "User",
      entityId: id,
      oldValue: { roleId: oldUser?.roleId },
      newValue: { roleId: roleRecord.id },
    });

    res.json({ success: true, message: "Admin role updated successfully", user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const oldUser = await User.findByPk(id);
    const updatedUser = await authService.updateUser(id, { isActive });

    await auditService.log({
      userId: req.user?.id,
      action: "UPDATE_ADMIN_STATUS",
      entityType: "User",
      entityId: id,
      oldValue: { isActive: oldUser?.isActive },
      newValue: { isActive },
    });

    res.json({
      success: true,
      message: `Admin account ${isActive ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const oldUser = await User.findByPk(id);
    await authService.deleteUser(id);

    await auditService.log({
      userId: req.user?.id,
      action: "DELETE_ADMIN",
      entityType: "User",
      entityId: id,
      oldValue: oldUser,
    });

    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getShippingSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.findOne();
    if (!settings) {
      return res.status(404).json({ success: false, message: "System settings not found" });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateShippingSettings = async (req, res) => {
  try {
    const updates = req.body;
    const settings = await SystemSetting.findOne();
    if (!settings) {
      return res.status(404).json({ success: false, message: "System settings not found" });
    }

    await settings.update(updates);

    await auditService.log({
      userId: req.user?.id,
      action: "UPDATE_SHIPPING_SETTINGS",
      entityType: "SystemSetting",
      entityId: settings.id,
      newValue: updates,
    });

    res.json({ success: true, message: "Shipping settings updated successfully", data: settings });
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
