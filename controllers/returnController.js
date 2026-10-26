const ReturnService = require("../services/returnServices");
const { ReturnRequest, Order, User, OrderItem, Product, Store, ProductImage } = require("../models");

class ReturnController {
  async getAll(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const filters = {};

      if (status) filters.status = status;

      // Filter by customer if not an admin
      if (!req.user.isAdmin) {
        filters.customerId = req.user.id;
      }

      const { rows, count } = await ReturnRequest.findAndCountAll({
        where: filters,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        include: [
          { model: Order, as: 'order' },
          { model: User, as: 'customer' },
          {
            model: OrderItem,
            as: 'orderItem',
            include: [{
              model: Product,
              as: 'product',
              include: [{ model: ProductImage, as: 'images' }]
            }]
          }
        ]
      });

      const data = rows.map(req => ({
        ...req.toJSON(),
        product: req.orderItem?.product
      }));

      return res.json({
        success: true,
        totalRecords: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: data,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const data = {
        ...req.body,
        customerId: req.user.id,
        evidence: req.files,
      };
      const request = await ReturnService.create(data);
      return res.status(201).json({
        success: true,
        message: "Return request filed successfully",
        data: request,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getOne(req, res) {
    try {
      const request = await ReturnRequest.findByPk(req.params.id, {
        include: [
          {
            model: OrderItem,
            as: 'orderItem',
            include: [{
              model: Product,
              as: 'product',
              include: [{ model: ProductImage, as: 'images' }]
            }]
          },
          { model: Store, as: 'store' },
          { model: Order, as: 'order' }
        ]
      });
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Return request not found",
        });
      }
      // Map orderItem.product to request.product for frontend compatibility
      const responseData = {
        ...request.toJSON(),
        product: request.orderItem?.product
      };
      return res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async approve(req, res) {
    try {
      const { id } = req.params;
      const { faultParty } = req.body; // 'CUSTOMER' or 'STORE'

      if (!faultParty) {
        return res.status(400).json({
          success: false,
          message: "Fault party must be specified (CUSTOMER or STORE)",
        });
      }

      const request = await ReturnService.approve(id, faultParty);
      return res.status(200).json({
        success: true,
        message: "Return request approved",
        data: request,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async reject(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Reason for rejection is required",
        });
      }

      const request = await ReturnService.reject(id, reason);
      return res.status(200).json({
        success: true,
        message: "Return request rejected",
        data: request,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getReturnRates(req, res) {
    try {
      const data = await ReturnService.getReturnRates(req.params.id, {
        pickupDate: req.body?.pickupDate,
        deliveryInstructions: req.body?.deliveryInstructions,
        senderPhone: req.body?.senderPhone,
        receiverPhone: req.body?.receiverPhone,
      });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async confirmRestock(req, res) {
    try {
      const { id } = req.params;
      const request = await ReturnService.confirmRestock(id);
      return res.status(200).json({
        success: true,
        message: "Restock confirmed, return completed",
        data: request,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ReturnController();
