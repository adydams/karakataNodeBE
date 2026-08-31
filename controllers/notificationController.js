const { Notification } = require("../models");
const { authenticate } = require("../middlewares/auth");

class NotificationController {
  /**
   * Get all notifications for the logged-in user
   */
  async getMyNotifications(req, res) {
    try {
      const notifications = await Notification.findAll({
        where: {
          userId: req.user.id,
          isDeleted: false,
        },
        order: [["createdAt", "DESC"]],
        limit: 50,
      });

      const unreadCount = await Notification.count({
        where: { userId: req.user.id, isRead: false, isDeleted: false },
      });

      res.json({
        success: true,
        data: notifications,
        unreadCount,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await Notification.findOne({
        where: { id, userId: req.user.id },
      });

      if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      await notification.update({ isRead: true });
      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      await Notification.update(
        { isRead: true },
        { where: { userId: req.user.id, isRead: false } }
      );
      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new NotificationController();
