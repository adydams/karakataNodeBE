const { Shipment, ShipmentEvent, User, Order } = require("../models");
const { Op } = require("sequelize");
const notificationService = require("../services/notificationService");

class DriverController {
  /**
   * Get all active shipments assigned to the logged-in driver.
   */
  async getTasks(req, res) {
    try {
      const driverId = req.user.id;

      const tasks = await Shipment.findAll({
        where: {
          driverId: driverId,
          status: {
            [Op.ne]: 'delivered'
          }
        },
        include: [
          {
            model: Order,
            as: 'order',
            include: [{ model: User, as: 'user' }]
          },
          { model: ShipmentEvent, as: 'events' }
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error("Error fetching driver tasks:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Update the status of a shipment and create a tracking event.
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, location, note } = req.body;
      const driverId = req.user.id;

      const shipment = await Shipment.findOne({ where: { id, driverId } });
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found or not assigned to you" });
      }

      // Update shipment status
      await shipment.update({ status });

      // Create tracking event
      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status,
        location,
        note,
      });

      // Notify user about status change
      const order = await Order.findByPk(shipment.orderId);
      if (order) {
        const user = await User.findByPk(order.userId);
        if (user) {
          if (status === "shipped") {
            await notificationService.notifyOrderShipped(user, order, shipment.id);
          } else if (status === "delivered") {
            await notificationService.notifyOrderDelivered(user, order);
          }
        }
      }

      return res.json({
        success: true,
        message: `Shipment status updated to ${status}`,
        shipment,
      });
    } catch (error) {
      console.error("Error updating shipment status:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = new DriverController();
