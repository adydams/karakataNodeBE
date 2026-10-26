// controllers/paymentController.js
const PaymentService = require("../services/paymentServices");
const CartService = require("../services/cartServices");
const { sequelize, Order, Payment, User, Cart, CartItem } = require("../models");

class PaymentController {
  static async initialize(req, res) {
    try {
      const { orderId, gateway } = req.body;
      const userId = req.user.id;

      const order = await Order.findByPk(orderId);
      const user = await User.findByPk(userId);

      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.userId !== userId) return res.status(403).json({ message: "You cannot initialize this order" });
      if (order.status !== "PENDING") return res.status(409).json({ message: "This order is no longer awaiting payment" });

      const { paymentUrl, paymentReference } = await PaymentService.initialize({
        order,
        user,
        gateway,
        redirectUrl: process.env.BACKEND_URL
      });

      const transaction = await sequelize.transaction();
      try {
        await Order.update(
          { paymentReference, paymentGateway: gateway || order.paymentGateway },
          { where: { id: order.id, status: "PENDING" }, transaction }
        );
        const [updatedPayments] = await Payment.update(
          { reference: paymentReference, paymentUrl },
          { where: { orderId: order.id, status: "PENDING" }, transaction }
        );
        if (!updatedPayments) throw new Error("Pending payment record not found");
        await transaction.commit();
      } catch (updateError) {
        await transaction.rollback();
        throw updateError;
      }

      res.status(200).json({ paymentUrl, paymentReference });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async verify(req, res) {
    try {
      const { gateway, orderId } = req.query;
       console.log("Before*******Im in verify payment controller", orderId);
    
        const order = await Order.findByPk(orderId);
        console.log("*******Im in verify payment controller", order, orderId);
    
      
      if (!order) throw new Error("Order not found");

      const result = await PaymentService.verify({
        gateway: gateway || order.paymentGateway,
        reference: req.query.reference || order.paymentReference
      });
      console.log("Payment Verification Result:", JSON.stringify(result, null, 2));

      if (result.success) {
        const OrderServices = require("../services/orderServices");
        await OrderServices.verify(orderId);

        // Clear the buyer's cart once payment is confirmed (mirrors the
        // webhook path, which already does this).
        try {
          const { Cart, CartItem } = require("../models");
          const userCart = await Cart.findOne({ where: { userId: order.userId, isDeleted: false } });
          if (userCart) {
            await CartItem.destroy({ where: { cartId: userCart.id } });
          }
        } catch (cartErr) {
          console.error(`Cart clear failed for order ${order.id}:`, cartErr.message);
        }

        if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
          return res.status(200).json({ success: true, orderId: order.id });
        }

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?orderId=${order.id}`
        );
      } else {
        order.status = "FAILED";
        order.paymentStatus = "FAILED";
        await order.save();

        if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
          return res.status(200).json({ success: false });
        }

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed`
        );
      }

    } catch (err) {
      console.error(err);
      if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed`
      );
    }
  }

  static async webhookPaystack(req, res) {
    try {
      const result = await PaymentService.handleWebhookPaystack(req.rawBody, req.headers['x-paystack-signature']);
      if (result.handled) {
        return res.status(200).json({ status: 'success' });
      }
      return res.status(404).json({ status: 'not_found' });
    } catch (err) {
      console.error("Paystack Webhook Error:", err);
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async webhookFlutterwave(req, res) {
    try {
      const result = await PaymentService.handleWebhookFlutterwave(req.rawBody, req.headers['verif-hash']);
      if (result.handled) {
        return res.status(200).json({ status: 'success' });
      }
      return res.status(404).json({ status: 'not_found' });
    } catch (err) {
      console.error("Flutterwave Webhook Error:", err);
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
}

module.exports = PaymentController;
