const storeService = require("../services/storeServices");
const { OrderItem, Product, Store, Order, User } = require("../models");
const { Op } = require("sequelize");
const OrderApprovalService = require("../services/orderApprovalService");

class StoreController {
 
  async create(req, res) {
    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const store = await storeService.createStore(
            req.body,
            req.user
        );

        return res.status(201).json({
            success: true,
            data: store
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
 }


  async getAll(req, res) {
    try {
      const stores = await storeService.getAllStores();
      res.json({ success: true, data: stores });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const store = await storeService.getStoreById(req.params.id);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const store = await storeService.updateStore(req.params.id, req.body);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const store = await storeService.deleteStore(req.params.id);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      res.json({ success: true, message: "Store deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getOrderApprovals(req, res) {
      try {
        const store = await Store.findOne({ where: { ownerUserId: req.user.id, isDeleted: false } });
        if (!store) return res.status(404).json({ success: false, message: "Store not found for this account" });
        const items = await OrderItem.findAll({
          where: { approvalStatus: "pending", approvalDeadline: { [Op.gt]: new Date() }, isDeleted: false },
          include: [
            { model: Product, as: "product", where: { storeId: store.id }, attributes: ["id", "name", "price"] },
            { model: Order, as: "order", attributes: ["id", "createdAt", "status", "userId"], include: [{ model: User, as: "user", attributes: ["name", "email"] }] },
          ],
          order: [["approvalDeadline", "ASC"]],
        });
        return res.json({ success: true, data: items });
      } catch (error) {
        console.error("Error fetching store order approvals:", error);
        return res.status(500).json({ success: false, message: error.message });
      }
    }

  async decideOrderApproval(req, res) {
      try {
        const { decision, reason } = req.body;
        if (!["approved", "declined"].includes(decision)) {
          return res.status(400).json({ success: false, message: "Decision must be approved or declined" });
        }
        const store = await Store.findOne({ where: { ownerUserId: req.user.id, isDeleted: false } });
        const item = await OrderItem.findByPk(req.params.orderItemId, {
          include: [{ model: Product, as: "product" }],
        });
        if (!store || !item || item.product?.storeId !== store.id) {
          return res.status(404).json({ success: false, message: "Order item not found for this store" });
        }
        if (item.approvalStatus !== "pending") {
          return res.status(409).json({ success: false, message: `Order item is already ${item.approvalStatus}` });
        }
        if (item.approvalDeadline && new Date(item.approvalDeadline) <= new Date()) {
          await OrderApprovalService.processRejectedItem(item.id, "Approval deadline passed", "expired");
          return res.status(409).json({ success: false, message: "The approval deadline has passed" });
        }
        if (decision === "declined") {
          await OrderApprovalService.processRejectedItem(item.id, reason || "Declined by store owner", "declined");
          return res.json({ success: true, message: "Order item declined and refund processing started" });
        }
        await item.update({ approvalStatus: decision, approvalRespondedAt: new Date(), approvalReason: reason || null });
        return res.json({ success: true, message: `Order item ${decision}`, data: item });
      } catch (error) {
        console.error("Error deciding order approval:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new StoreController();
