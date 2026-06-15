const { Op } = require("sequelize");
const Permission = require("../models/permissionModel");
const Role = require("../models/roleModel");
const auditService = require("./auditService");

exports.getAllPermissions = async (filters) => {
  const { name, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  const whereClause = { isDeleted: false };
  if (name) whereClause.name = { [Op.like]: `%${name}%` };

  const { rows, count } = await Permission.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["createdAt", "DESC"]],
  });

  return {
    totalRecords: count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(count / limit),
    data: rows,
  };
};


exports.getPermissionsByNames = async (names) => {
  return await Permission.findAll({
    where: {
      name: {
        [Op.in]: names
      },
      isDeleted: false
    }
  });
};

exports.getPermissionByName = async (name) => {
  return await Permission.findOne({
    where: {
      name,
      isDeleted: false
    }
  });
};

exports.createPermission = async (data, currentUserId) => {
  const { name, description } = data;

  if (!name) throw new Error("Name is required");

  const exists = await Permission.findOne({ where: { name } });
  if (exists) throw new Error("Permission already exists");

  const permission = await Permission.create({ name, description, createdBy: currentUserId });

  await auditService.logAction({
    userId: currentUserId,
    action: "CREATE",
    entityType: "Permission",
    entityId: permission.id,
    oldValue: null,
    newValue: permission.toJSON(),
  });

  return permission;
};

exports.updatePermission = async (id, data, currentUserId) => {
  const { name, description } = data;

  const oldPermission = await Permission.findByPk(id);
  if (!oldPermission || oldPermission.isDeleted) throw new Error("Permission not found");

  const oldValue = oldPermission.toJSON();

  oldPermission.name = name || oldPermission.name;
  oldPermission.description = description || oldPermission.description;
  oldPermission.updatedBy = currentUserId;
  await oldPermission.save();

  await auditService.logAction({
    userId: currentUserId,
    action: "UPDATE",
    entityType: "Permission",
    entityId: id,
    oldValue: oldValue,
    newValue: oldPermission.toJSON(),
  });

  return oldPermission;
};

exports.deletePermission = async (id, currentUserId) => {
  const permission = await Permission.findByPk(id);
  if (!permission || permission.isDeleted) throw new Error("Permission not found");

  const oldValue = permission.toJSON();

  permission.isDeleted = true;
  permission.deletedBy = currentUserId;
  await permission.save();

  await auditService.logAction({
    userId: currentUserId,
    action: "DELETE",
    entityType: "Permission",
    entityId: id,
    oldValue: oldValue,
    newValue: null,
  });

  return { message: "Permission deleted successfully" };
};


exports.assignPermissionsToRole = async (roleId, permissionIds, currentUserId) => {
  const role = await Role.findByPk(roleId);

  if (!role) throw new Error("Role not found");

  const oldPermissions = await role.getPermissions();
  const oldPermissionIds = oldPermissions.map((p) => p.id);

  const permissions = await Permission.findAll({
    where: { id: permissionIds },
  });

  if (!permissions.length) {
    throw new Error("No valid permissions found");
  }

  await role.setPermissions(permissions); // Sequelize magic method

  const newPermissions = await role.getPermissions();
  const newPermissionIds = newPermissions.map((p) => p.id);

  await auditService.logAction({
    userId: currentUserId,
    action: "ASSIGN",
    entityType: "RolePermission",
    entityId: roleId,
    oldValue: oldPermissionIds,
    newValue: newPermissionIds,
  });

  return {
    message: "Permissions assigned successfully",
    roleId,
    permissionCount: permissions.length,
  };
};
