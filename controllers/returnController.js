const ReturnService = require("../services/returnServices");
const { ReturnRequest } = require("../models");

class ReturnController {
  async create(req, res) {
    try {
      const data = {
        ...req.body,
        customerId: req.user.id,
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
      const request = await ReturnRequest.findByPk(req.params.id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Return request not found",
        });
      }
      return res.status(200).json({
        success: true,
        data: request,
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
