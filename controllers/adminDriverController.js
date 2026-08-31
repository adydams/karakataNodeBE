const { User, Shipment, ShipmentEvent, Order, Role } = require("../models");
const { Op } = require("sequelize");

class AdminDriverController {
  /**
   * Get a summary of all drivers and their current workload.
   * Useful for the admin dashboard overview.
   */
  async getDriversSummary(req, res) {
    try {
      const drivers = await User.findAll({
        include: [
          {
            model: Role,
            as: "role",
            where: { name: "Driver" },
          },
          {
            model: Shipment,
            as: "shipments", // Need to check if User.hasMany(Shipment) exists
          },
        ],
        attributes: ["id", "name", "email", "phone"],
      });

      const summary = drivers.map(driver => {
        const activeShipments = driver.shipments?.filter(s => s.status !== 'delivered') || [];
        const completedShipments = driver.shipments?.filter(s => s.status === 'delivered') || [];

        return {
          id: driver.id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          activeTasks: activeShipments.length,
          completedTasks: completedShipments.length,
          status: activeShipments.length > 5 ? "Overloaded" : activeShipments.length > 0 ? "Active" : "Idle"
        };
      });

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Error fetching drivers summary:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Get all shipments currently in transit or pending, grouped by driver.
   */
  async getActiveDeliveries(req, res) {
    try {
      const activeShipments = await Shipment.findAll({
        where: {
          status: { [Op.ne]: 'delivered' }
        },
        include: [
          {
            model: User,
            as: 'driver',
            attributes: ["id", "name", "phone"]
          },
          {
            model: Order,
            as: 'order',
            attributes: ["id", "totalAmount", "createdAt"],
            include: [{ model: User, as: 'user', attributes: ["name", "phone"] }]
          },
          {
            model: ShipmentEvent,
            as: 'events',
            order: [['createdAt', 'DESC']]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      return res.json({
        success: true,
        data: activeShipments,
      });
    } catch (error) {
      console.error("Error fetching active deliveries:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Get a detailed report for a specific driver.
   */
  async getDriverReport(req, res) {
    try {
      const { driverId } = req.params;

      const driver = await User.findByPk(driverId, {
        include: [
          {
            model: Shipment,
            as: "shipments",
          }
        ]
      });

      if (!driver) {
        return res.status(404).json({ success: false, message: "Driver not found" });
      }

      const allShipments = driver.shipments || [];
      const completed = allShipments.filter(s => s.status === 'delivered');
      const active = allShipments.filter(s => s.status !== 'delivered');

      return res.json({
        success: true,
        report: {
          driver: {
            name: driver.name,
            email: driver.email,
            phone: driver.phone
          },
          stats: {
            totalShipments: allShipments.length,
            completed: completed.length,
            active: active.length,
            successRate: allShipments.length > 0
              ? parseFloat(((completed.length / allShipments.length) * 100).toFixed(2))
              : 0
          },
          activeTasks: active.map(s => ({
            shipmentId: s.id,
            status: s.status,
            orderId: s.orderId,
            createdAt: s.createdAt
          }))
        }
      });
    } catch (error) {
      console.error("Error generating driver report:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = new AdminDriverController();
