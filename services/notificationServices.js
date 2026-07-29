const { Notification, User, Store } = require("../models");
const { Op } = require("sequelize");
const emailServices = require("./emailServices");

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

  async lowStockAlert(storeOwnerId, productId, stationName, remaining) {
    // Fetch product name and owner email
    const product = await require("../models").Product.findByPk(productId);
    const owner = await User.findByPk(storeOwnerId);

    const productName = product ? product.name : "Unknown Product";
    const message = `Low Stock Alert: "${productName}" at ${stationName} has only ${remaining} unit(s) remaining.`;

    // 1. In-app notification
    await this.send(
      storeOwnerId,
      "LOW_STOCK",
      "Low Stock Alert ⚠️",
      message,
      { productId, stationName }
    );

    // 2. Email notification
    if (owner && owner.email) {
      try {
        await emailServices.sendEmail({
          to: owner.email,
          subject: "⚠️ Low Stock Alert",
          text: message,
          html: `<p>${message}</p><p>Please restock the product at <strong>${stationName}</strong> as soon as possible.</p>`
        });
      } catch (err) {
        console.error("Failed to send low stock email:", err);
      }
    }
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
