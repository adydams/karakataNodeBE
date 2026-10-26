const { Shipment, ShipmentEvent, User, Order, OrderItem, OrderItemFulfillment, StorePickupStation, Product } = require("../models");
const { Op } = require("sequelize");
const notificationService = require("../services/notificationService");
const LogisticsService = require("../services/logisticsService");
const sequelize = require("../db/database");

// Fulfillment statuses that end an item's journey
const TERMINAL_FULFILLMENT_STATUSES = ["DELIVERED", "FAILED", "RETURNED"];

class DriverController {
  /**
   * Get all active shipments assigned to the logged-in driver.
   * Each shipment includes its per-item fulfillments (the actionable units).
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
            include: [
              { model: User, as: 'user' },
              {
                model: OrderItem,
                as: 'items',
                include: [{
                  model: OrderItemFulfillment,
                  as: 'fulfillments',
                  include: [{
                    model: StorePickupStation,
                    as: 'pickupStation',
                    attributes: ["id", "name", "address", "phone", "latitude", "longitude"]
                  }]
                }]
              }
            ]
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
   * Update the status of ONE fulfillment (a product at a station).
   * The shipment auto-completes only when every fulfillment is terminal,
   * so one failed/refused item never blocks the rest of the delivery.
   */
  async updateFulfillmentStatus(req, res) {
    const t = await sequelize.transaction();
    try {
      const { fulfillmentId } = req.params;
      const { status, note } = req.body;
      const driverId = req.user.id;

      if (!status) throw new Error("Status is required");
      const normalized = String(status).toUpperCase();
      if (!["PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"].includes(normalized)) {
        throw new Error("Invalid fulfillment status");
      }

      const fulfillment = await OrderItemFulfillment.findByPk(fulfillmentId, {
        include: [{
          model: OrderItem,
          as: "orderItem",
          include: [{ model: Order, as: "order" }]
        }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!fulfillment) throw new Error("Fulfillment not found");

      const order = fulfillment.orderItem?.order;
      const shipment = await Shipment.findOne({
        where: { orderId: order.id, driverId, isDeleted: false },
        transaction: t,
      });
      if (!shipment) throw new Error("Shipment not found or not assigned to you");
      if (shipment.status === "delivered" || shipment.status === "cancelled") {
        throw new Error(`Shipment is already ${shipment.status}`);
      }

      await fulfillment.update({
        status: normalized,
        statusNote: note || null,
        statusUpdatedAt: new Date(),
      }, { transaction: t });

      // Keep the parent OrderItem in sync with its fulfillments:
      // all DELIVERED -> item DELIVERED; any FAILED/RETURNED -> item FAILED.
      const siblings = await OrderItemFulfillment.findAll({
        where: { orderItemId: fulfillment.orderItemId },
        transaction: t,
      });
      const siblingStatuses = siblings.map(s => s.status);
      const itemStatus = siblingStatuses.every(s => s === "DELIVERED")
        ? "DELIVERED"
        : siblingStatuses.some(s => s === "FAILED" || s === "RETURNED")
          ? "FAILED"
          : "PENDING";
      await OrderItem.update(
        { status: itemStatus },
        { where: { id: fulfillment.orderItemId }, transaction: t }
      );

      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: normalized,
        location: "Driver App",
        note: note || `Item fulfillment marked ${normalized.toLowerCase()}`,
      }, { transaction: t });

      // Auto-complete the shipment when every fulfillment is terminal
      const allFulfillments = await OrderItemFulfillment.findAll({
        include: [{
          model: OrderItem,
          as: "orderItem",
          where: { orderId: order.id },
          attributes: ["id"]
        }],
        transaction: t,
      });
      const allTerminal = allFulfillments.length > 0 && allFulfillments.every(f => TERMINAL_FULFILLMENT_STATUSES.includes(f.status));

      let shipmentStatus = shipment.status;
      if (allTerminal) {
        // Shipment outcome: delivered if any item succeeded, else returned
        const anyDelivered = allFulfillments.some(f => f.status === "DELIVERED");
        shipmentStatus = anyDelivered ? "delivered" : "returned";
        await shipment.update({ status: shipmentStatus }, { transaction: t });
        await LogisticsService.syncOrderLogisticsStatus(order.id, shipmentStatus);
      } else if (normalized === "PICKED_UP" && shipment.status === "pending") {
        shipmentStatus = "picked_up";
        await shipment.update({ status: shipmentStatus }, { transaction: t });
        await LogisticsService.syncOrderLogisticsStatus(order.id, shipmentStatus);
      } else if (normalized === "IN_TRANSIT" && ["pending", "picked_up", "assigned"].includes(shipment.status)) {
        shipmentStatus = "in_transit";
        await shipment.update({ status: shipmentStatus }, { transaction: t });
        await LogisticsService.syncOrderLogisticsStatus(order.id, shipmentStatus);
      }

      await t.commit();

      // Post-commit: notify the customer about the item-level change
      try {
        const user = await User.findByPk(order.userId);
        if (user) {
          const item = fulfillment.orderItem;
          const productName = item.productName || "ordered product";
          const message = normalized === "DELIVERED"
            ? `Your item "${productName}" has been delivered.`
            : normalized === "FAILED"
              ? `Delivery of "${productName}" could not be completed.${note ? ` Reason: ${note}` : ""}`
              : `Your item "${productName}" is ${normalized.toLowerCase().replace("_", " ")}.`;
          await notificationService.notify(user.id, {
            type: normalized === "DELIVERED" ? "ORDER_DELIVERED" : normalized === "FAILED" ? "SHIPMENT_FAILED" : "SHIPMENT_IN_TRANSIT",
            title: normalized === "DELIVERED" ? "Item Delivered!" : normalized === "FAILED" ? "Delivery Issue" : "Shipment Update",
            message,
            metadata: { orderId: order.id, shipmentId: shipment.id, fulfillmentId: fulfillment.id },
            sendEmail: true,
          });
        }
      } catch (notifyErr) {
        console.error(`Fulfillment notification failed for ${fulfillment.id}:`, notifyErr.message);
      }

      return res.json({
        success: true,
        message: `Fulfillment marked ${normalized.toLowerCase()}`,
        data: {
          fulfillment,
          shipmentStatus,
          shipmentCompleted: allTerminal,
        },
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error("Error updating fulfillment status:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Accept a shipment task.
   */
  async acceptTask(req, res) {
    try {
      const { id } = req.params;
      const driverId = req.user.id;

      const shipment = await Shipment.findOne({ where: { id, driverId } });
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found or not assigned to you" });
      }

      const normalizedStatus = LogisticsService.normalizeShipmentStatus('accepted');
      await shipment.update({ status: normalizedStatus });
      await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);

      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: 'TASK_ACCEPTED',
        location: 'Driver App',
        note: 'Driver has accepted the delivery task'
      });

      return res.json({
        success: true,
        message: "Task accepted successfully",
        shipment
      });
    } catch (error) {
      console.error("Error accepting task:", error);
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

      const normalizedStatus = LogisticsService.normalizeShipmentStatus(status);
      const previousStatus = shipment.status;

      // Update shipment status
      await shipment.update({ status: normalizedStatus });
      await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);

      // Create tracking event
      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: normalizedStatus.toUpperCase(),
        location,
        note,
      });

      // Notify user about status change
      const order = await Order.findByPk(shipment.orderId);
      if (order) {
        const user = await User.findByPk(order.userId);
        if (user) {
          if (previousStatus !== normalizedStatus) {
            await notificationService.notifyShipmentStatus(
              user,
              order,
              shipment,
              normalizedStatus,
              location
            );
          }
          if (normalizedStatus === "delivered") {

            // Mark all items in this order as DELIVERED to enable returns
            await OrderItem.update(
              { status: 'DELIVERED' },
              { where: { orderId: order.id } }
            );
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
