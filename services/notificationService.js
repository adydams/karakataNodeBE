const { Notification, User } = require("../models");
const emailService = require("./emailService");

class NotificationService {
  /**
   * Create a notification for a user and optionally send an email.
   */
  async notify(userId, { type, title, message, metadata = {}, sendEmail = false }, transaction = null) {
    console.log(`[NotificationService] notify called: userId=${userId}, type=${type}, sendEmail=${sendEmail}`);
    try {
      // 1. Create the DB notification
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        metadata,
      }, { transaction });
      console.log(`[NotificationService] DB Notification created: ${notification.id}`);

      // 2. Send email if requested
      if (sendEmail) {
        const user = await User.findByPk(userId);
        if (user && user.email) {
          console.log(`[NotificationService] Attempting to send email to: ${user.email}`);
          await emailService.sendNotificationEmail(user.email, title, message);
          console.log(`[NotificationService] Email sent successfully`);
        } else {
          console.warn(`[NotificationService] Email skipped: user not found or no email provided`);
        }
      }

      return notification;
    } catch (error) {
      console.error("[NotificationService] Error in notify():", error);
      throw error;
    }
  }

  /**
   * Convenience methods for common events
   */
  async orderPlaced(userId, orderId, total, transaction) {
    console.log(`[NotificationService] orderPlaced called: userId=${userId}, orderId=${orderId}, total=${total}`);
    return this.notify(userId, {
      type: "ORDER_PLACED",
      title: "Order Placed 🛍️",
      message: `Your order has been placed successfully. Total: ₦${total.toLocaleString()}.`,
      metadata: { orderId },
      sendEmail: true,
    }, transaction);
  }

  async notifyOrderShipped(user, order, shipmentId) {
    console.log(`[NotificationService] notifyOrderShipped called for order: ${order.id}`);
    return this.notify(user.id, {
      type: "ORDER_SHIPPED",
      title: "Your Order is on the Way!",
      message: `Great news! Your order #${order.id.slice(0, 8)} has been shipped and is heading to you.`,
      metadata: { orderId: order.id, shipmentId },
      sendEmail: true,
    });
  }

  async notifyOrderDelivered(user, order) {
    console.log(`[NotificationService] notifyOrderDelivered called for order: ${order.id}`);
    return this.notify(user.id, {
      type: "ORDER_DELIVERED",
      title: "Order Delivered!",
      message: `Your order #${order.id.slice(0, 8)} has been delivered. Enjoy your purchase!`,
      metadata: { orderId: order.id },
      sendEmail: true,
    });
  }
}

console.log("[NotificationService] Initializing NotificationService singleton...");
const instance = new NotificationService();
module.exports = instance;