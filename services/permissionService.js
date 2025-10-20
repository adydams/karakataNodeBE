const { Op } = require("sequelize");
const Permission = require("../models/permissionModel");

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

exports.createPermission = async (data) => {
  const { name, description } = data;

  if (!name) throw new Error("Name is required");

  const exists = await Permission.findOne({ where: { name } });
  if (exists) throw new Error("Permission already exists");

  return await Permission.create({ name, description });
};

exports.updatePermission = async (id, data) => {
  const { name, description } = data;

  const permission = await Permission.findByPk(id);
  if (!permission || permission.isDeleted) throw new Error("Permission not found");

  permission.name = name || permission.name;
  permission.description = description || permission.description;

  await permission.save();
  return permission;
};

exports.deletePermission = async (id) => {
  const permission = await Permission.findByPk(id);
  if (!permission || permission.isDeleted) throw new Error("Permission not found");

  permission.isDeleted = true;
  await permission.save();

  return { message: "Permission deleted successfully" };
};
