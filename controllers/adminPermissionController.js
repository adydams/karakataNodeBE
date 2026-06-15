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

exports.createPermissions = async (req, res) => {
  try {
    const permissions = req.body;
    const userId = req.user.id; // Assuming you have user info in req.user

    const createdPermissions = [];
    const existingPermissions = [];

    for (const permission of permissions) {
      const existing = await permissionService.getPermissionByName(
        permission.name
      );

      if (existing) {
        existingPermissions.push(permission.name);
        continue;
      }

      const created = await permissionService.createPermission(permission, userId);
      createdPermissions.push(created);
    }

    if (createdPermissions.length === 0) {
      return res.status(409).json({
        success: false,
        message: "All permissions already exist",
        data: {
          existing: existingPermissions
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: `${createdPermissions.length} permission(s) created successfully`,
      data: {
        created: createdPermissions,
        existing: existingPermissions
      }
    });

  } catch (error) {
    console.error("❌ Error creating permissions:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
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


exports.assignPermissions = async (req, res) => {
  try {
    const { roleId, permissionIds } = req.body;

    const result = await rolePermissionService.assignPermissionsToRole(
      roleId,
      permissionIds
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};