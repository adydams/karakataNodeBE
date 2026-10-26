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

  async notifyOrderPaid(user, order) {
    return this.notify(user.id, {
      type: "ORDER_PAID",
      title: "Payment received",
      message: `Payment for order #${order.id.slice(0, 8)} was received successfully.`,
      metadata: { orderId: order.id },
      sendEmail: true,
    });
  }

  async notifyStoreOwnersPayment(ownerId, order) {
    return this.notify(ownerId, {
      type: "STORE_PAYMENT_CONFIRMED",
      title: "Order Paid! 📦",
      message: `Payment for order #${order.id.slice(0, 8)} has been confirmed. Please prepare the package and drop it at the closest Karakata office address for shipping.`,
      metadata: { orderId: order.id },
      sendEmail: true,
    });
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

  async notifyShipmentStatus(user, order, shipment, status, location = null) {
    const messages = {
      picked_up: { type: "SHIPMENT_PICKED_UP", title: "Your order has been picked up", message: `The rider has picked up order #${order.id.slice(0, 8)} from the store.` },
      shipped: { type: "ORDER_SHIPPED", title: "Your order is on the way", message: `Order #${order.id.slice(0, 8)} has left the store and is on the way to you.` },
      in_transit: { type: "SHIPMENT_IN_TRANSIT", title: "Your order is in transit", message: `Order #${order.id.slice(0, 8)} is currently in transit.` },
      delivered: { type: "ORDER_DELIVERED", title: "Your order has been delivered", message: `Order #${order.id.slice(0, 8)} has been delivered.` },
      failed: { type: "SHIPMENT_FAILED", title: "Delivery needs attention", message: `Delivery for order #${order.id.slice(0, 8)} could not be completed.` },
    };
    const update = messages[status];
    if (!update) return null;
    return this.notify(user.id, {
      ...update,
      message: location ? `${update.message} Location: ${location}.` : update.message,
      metadata: { orderId: order.id, shipmentId: shipment.id, status, location },
      sendEmail: true,
    });
  }
}

console.log("[NotificationService] Initializing NotificationService singleton...");
const instance = new NotificationService();
module.exports = instance;