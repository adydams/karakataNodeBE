const { AuditLog, User } = require("../models");
const { Op } = require("sequelize");

exports.getAuditLogs = async (req, res) => {
  try {
    const { action, entityType, userId, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const filters = {};

    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (userId) filters.userId = userId;
    if (search) {
      filters[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { entityType: { [Op.like]: `%${search}%` } },
        { entityId: { [Op.like]: `%${search}%` } },
      ];
    }

    const logs = await AuditLog.findAndCountAll({
      where: filters,
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      totalRecords: logs.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(logs.count / limit),
      data: logs.rows,
    });
  } catch (err) {
    console.error("❌ Audit Log Fetch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLogDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AuditLog.findByPk(id, {
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
    });

    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log entry not found" });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    console.error("❌ Audit Log Detail Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
