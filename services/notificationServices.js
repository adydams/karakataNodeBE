const { Notification } = require("../models");
const { Op } = require("sequelize");

class NotificationServices {
  async send(userId, type, title, message, metadata = null, transaction) {
    return Notification.create(
      { userId, type, title, message, metadata },
      { transaction }
    );
  }

  // ---- Domain-specific helpers ----

  async orderPlaced(userId, orderId, total, transaction) {
    return this.send(
      userId,
      "ORDER_PLACED",
      "Order Placed 🛍️",
      `Your order has been placed successfully. Total: ₦${total.toLocaleString()}.`,
      { orderId },
      transaction
    );
  }

  async orderPaid(userId, orderId, transaction) {
    return this.send(
      userId,
      "ORDER_PAID",
      "Payment Confirmed ✅",
      "Your payment was confirmed. We're preparing your order.",
      { orderId },
      transaction
    );
  }

  async orderShipped(userId, orderId, trackingCode) {
    return this.send(
      userId,
      "ORDER_SHIPPED",
      "Order Shipped 🚚",
      `Your order is on its way! Tracking: ${trackingCode || "N/A"}.`,
      { orderId }
    );
  }

  async lowStockAlert(adminUserId, productId, productName, remaining) {
    return this.send(
      adminUserId,
      "LOW_STOCK",
      "Low Stock Alert ⚠️",
      `"${productName}" has only ${remaining} unit(s) remaining.`,
      { productId }
    );
  }

  // ---- Read / management ----

  async getForUser(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    return Notification.findAndCountAll({
      where: { userId, isDeleted: false },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });
  }

  async markRead(notificationId, userId) {
    const notif = await Notification.findOne({
      where: { id: notificationId, userId, isDeleted: false },
    });
    if (!notif) throw new Error("Notification not found");
    notif.isRead = true;
    return notif.save();
  }

  async markAllRead(userId) {
    return Notification.update(
      { isRead: true },
      { where: { userId, isRead: false, isDeleted: false } }
    );
  }

  async unreadCount(userId) {
    return Notification.count({
      where: { userId, isRead: false, isDeleted: false },
    });
  }
}

module.exports = new NotificationServices();