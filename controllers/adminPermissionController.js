const permissionService = require("../services/permissionService");

// 🔹 GET all permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const result = await permissionService.getAllPermissions(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("❌ Error fetching permissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 CREATE a new permission
exports.createPermission = async (req, res) => {
  try {
    const permission = await permissionService.createPermission(req.body);
    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: permission,
    });
  } catch (error) {
    console.error("❌ Error creating permission:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// 🔹 UPDATE a permission
exports.updatePermission = async (req, res) => {
  try {
    const updated = await permissionService.updatePermission(req.params.id, req.body);
    res.json({
      success: true,
      message: "Permission updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error updating permission:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// 🔹 DELETE (soft delete)
exports.deletePermission = async (req, res) => {
  try {
    const result = await permissionService.deletePermission(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("❌ Error deleting permission:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
