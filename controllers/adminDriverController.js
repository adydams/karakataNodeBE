const { User, Shipment, ShipmentEvent, Order, OrderItem, OrderItemFulfillment, StorePickupStation, Role } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../db/database");
const shippingManager = require("../services/shippingManager");
const shipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapterSafe");
const LogisticsService = require("../services/logisticsService");
const notificationService = require("../services/notificationService");

const TERMINAL_FULFILLMENT_STATUSES = ["DELIVERED", "FAILED", "RETURNED"];

/**
 * Notify the customer about a shipment status change (app + email).
 * Best-effort: failures are logged, never block the status update.
 */
async function notifyCustomerStatus(shipment, status, location = null) {
  try {
    const order = await Order.findByPk(shipment.orderId);
    if (!order) return;
    const user = await User.findByPk(order.userId);
    if (!user) return;
    await notificationService.notifyShipmentStatus(user, order, shipment, status, location);
  } catch (err) {
    console.error(`Customer shipment notification failed for ${shipment.id}:`, err.message);
  }
}

/**
 * Recompute an OrderItem's status from its fulfillments and, when every
 * fulfillment in the order is terminal, complete the shipment.
 */
async function syncFulfillmentRollup(orderId, transaction) {
  const fulfillments = await OrderItemFulfillment.findAll({
    include: [{
      model: OrderItem,
      as: "orderItem",
      where: { orderId },
      attributes: ["id"]
    }],
    transaction,
  });

  // Per-item rollup
  const byItem = new Map();
  for (const f of fulfillments) {
    const key = f.orderItemId;
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(f.status);
  }
  for (const [orderItemId, statuses] of byItem.entries()) {
    const itemStatus = statuses.every(s => s === "DELIVERED")
      ? "DELIVERED"
      : statuses.some(s => s === "FAILED" || s === "RETURNED")
        ? "FAILED"
        : "PENDING";
    await OrderItem.update({ status: itemStatus }, { where: { id: orderItemId }, transaction });
  }

  // Shipment completion
  const allTerminal = fulfillments.length > 0 && fulfillments.every(f => TERMINAL_FULFILLMENT_STATUSES.includes(f.status));
  if (allTerminal) {
    const anyDelivered = fulfillments.some(f => f.status === "DELIVERED");
    const shipmentStatus = anyDelivered ? "delivered" : "returned";
    const shipment = await Shipment.findOne({ where: { orderId, isDeleted: false }, transaction });
    if (shipment && shipment.status !== shipmentStatus) {
      await shipment.update({ status: shipmentStatus }, { transaction });
      await LogisticsService.syncOrderLogisticsStatus(orderId, shipmentStatus);
    }
  }
  return { allTerminal };
}

class AdminDriverController {
  /**
   * Get a paginated list of Captains (Drivers) with filters.
   */
  async getCaptains(req, res) {
    try {
      const { name, phone, email, status, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const filters = {};

      if (name) filters.name = { [Op.like]: `%${name}%` };
      if (phone) filters.phone = { [Op.like]: `%${phone}%` };
      if (email) filters.email = { [Op.like]: `%${email}%` };

      const include = [
        {
          model: Role,
          as: "role",
          where: { name: "Driver" },
          required: true,
        },
        {
          model: Shipment,
          as: "shipments",
        },
      ];

      const { rows, count } = await User.findAndCountAll({
        where: filters,
        include,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      const data = rows.map(driver => {
        const activeShipments = driver.shipments?.filter(s => s.status !== 'delivered') || [];
        const completedShipments = driver.shipments?.filter(s => s.status === 'delivered') || [];
        return {
          ...driver.toJSON(),
          activeTasks: activeShipments.length,
          completedTasks: completedShipments.length,
          status: activeShipments.length > 5 ? "Overloaded" : activeShipments.length > 0 ? "Active" : "Idle"
        };
      });

      res.json({
        success: true,
        totalRecords: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data,
      });
    } catch (error) {
      console.error("Error fetching captains:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

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
            as: "shipments",
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
   * Get all shipments with advanced filters (provider, status, search).
   */
  async getShipments(req, res) {
    try {
      const { search, provider, status, driverId, customer, startDate, endDate, page, offset: requestedOffset, limit = 10 } = req.query;
      const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
      const currentPage = Math.max(Number(page) || 1, 1);
      const offset = requestedOffset !== undefined
        ? Math.max(Number(requestedOffset) || 0, 0)
        : (currentPage - 1) * pageSize;
      let filters = { isDeleted: false };

      console.log(`[Debug] getShipments params: search=${search}, provider=${provider}, status=${status}, driverId=${driverId}, customer=${customer}, dates=${startDate}-${endDate}`);

      if (provider && provider !== 'ALL') {
        filters.provider = { [Op.iLike]: provider };
      }
      if (status && status !== 'ALL') {
        filters.status = { [Op.iLike]: status };
      }
      if (driverId && driverId !== 'ALL') {
        filters.driverId = driverId;
      }
      if (customer && customer.trim() !== "") {
        filters['$order.user.name$'] = { [Op.iLike]: `%${customer}%` };
      }
      if (startDate || endDate) {
        const dateRange = {};
        if (startDate) dateRange[Op.gte] = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateRange[Op.lte] = end;
        }
        filters.createdAt = dateRange;
      }

      if (search && search.trim() !== "") {
        const searchFilter = {
          [Op.or]: [
            { id: { [Op.like]: `%${search}%` } },
            { '$driver.name$': { [Op.like]: `%${search}%` } },
            { '$order.user.name$': { [Op.like]: `%${search}%` } },
            { '$order.id$': { [Op.like]: `%${search}%` } },
          ]
        };

        if (Object.keys(filters).length > 0) {
          filters = { [Op.and]: [filters, searchFilter] };
        } else {
          filters = searchFilter;
        }
      }

      console.log(`[Debug] Final filters:`, JSON.stringify(filters));

      const shipments = await Shipment.findAll({
        where: filters,
        include: [
          { model: User, as: 'driver', attributes: ["id", "name", "phone"] },
          {
            model: Order,
            as: 'order',
            attributes: [
              "id",
              "totalAmount",
              "shippingFee",
              "shippingMethod",
              "shippingSnapshot",
              "logisticsStatus",
              "createdAt",
            ],
            include: [
              { model: User, as: 'user', attributes: ["name", "phone"] },
              {
                model: OrderItem,
                as: 'items',
                attributes: ["id", "productName", "quantity", "price", "status"],
                include: [{
                  model: OrderItemFulfillment,
                  as: 'fulfillments',
                  attributes: ["id", "pickupStationId", "quantity", "status", "statusNote"],
                  include: [{
                    model: StorePickupStation,
                    as: 'pickupStation',
                    attributes: ["id", "name", "address"]
                  }]
                }]
              }
            ]
          },
          { model: ShipmentEvent, as: 'events' }
        ],
        order: [
          ['createdAt', 'DESC'],
          [{ model: ShipmentEvent, as: 'events' }, 'createdAt', 'DESC']
        ],
        limit: pageSize,
        offset: parseInt(offset),
      });

      const total = await Shipment.count({ where: filters, distinct: true, col: "id" });
      console.log(`[Debug] Found ${shipments.length} shipments, total count: ${total}`);

      return res.json({
        success: true,
        data: shipments,
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: Math.floor(offset / pageSize) + 1
      });
    } catch (error) {
      console.error("Error fetching shipments:", error);
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

  /**
   * Assign a driver to a shipment.
   */
  async assignDriver(req, res) {
    try {
      const { shipmentId, driverId } = req.body;

      if (!shipmentId || !driverId) {
        return res.status(400).json({ success: false, message: "Shipment ID and Driver ID are required" });
      }

      const shipment = await Shipment.findByPk(shipmentId);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      const driver = await User.findOne({
        where: { id: driverId, isDeleted: false },
        include: [{ model: Role, as: "role", where: { name: "Driver" }, required: true }],
      });
      if (!driver) {
        return res.status(400).json({ success: false, message: "Selected user is not an active driver" });
      }

      const normalizedStatus = LogisticsService.normalizeShipmentStatus('assigned');
      await shipment.update({
        driverId: driverId,
        status: normalizedStatus
      });
      await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);

      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: 'ASSIGNED_TO_DRIVER',
        location: 'Admin Panel',
        note: 'Shipment assigned to driver'
      });

      return res.json({
        success: true,
        message: "Driver assigned successfully",
        shipment
      });
    } catch (error) {
      console.error("Error assigning driver:", error);
      return res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  async updateShipmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, location, note } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: "Status is required" });
      }

      const shipment = await Shipment.findByPk(id);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      const normalizedStatus = LogisticsService.normalizeShipmentStatus(status);

      await shipment.update({ status: normalizedStatus });
      await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);

      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: normalizedStatus.toUpperCase(),
        location: location || "Unknown",
        note: note || `Status updated to ${normalizedStatus}`,
      });

      await notifyCustomerStatus(shipment, normalizedStatus, location);

      return res.json({
        success: true,
        message: `Shipment status updated to ${normalizedStatus}`,
        shipment: { ...shipment.toJSON(), status: normalizedStatus }
      });
    } catch (error) {
      console.error("Error updating shipment status:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Cancel a shipment.
   */
  async cancelShipment(req, res) {
    try {
      const { id } = req.params;
      const shipment = await Shipment.findByPk(id);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      if (shipment.status === 'delivered') {
        return res.status(400).json({ success: false, message: "Cannot cancel a delivered shipment" });
      }
      if (shipment.status === "cancelled") {
        return res.status(409).json({ success: false, message: "Shipment is already cancelled" });
      }

      const approvedItems = await OrderItem.count({
        where: { orderId: shipment.orderId, approvalStatus: "approved", isDeleted: false },
      });
      if (approvedItems > 0) {
        return res.status(409).json({ success: false, message: "Approved order items lock this shipment from cancellation" });
      }

      if (shipment.provider === "shipbubble") {
        if (!shipment.providerOrderId) {
          return res.status(409).json({ success: false, message: "ShipBubble order reference is missing" });
        }
        const cancellation = await shipBubbleAdapter.cancelShipment(shipment.providerOrderId);
        if (!cancellation.confirmed) {
          return res.status(502).json({ success: false, message: "ShipBubble did not confirm cancellation" });
        }
      }

      const normalizedStatus = LogisticsService.normalizeShipmentStatus("cancelled");
      await shipment.update({ status: normalizedStatus });
      await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);

      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: 'CANCELLED',
        location: 'Admin Panel',
        note: 'Shipment cancelled by administrator'
      });

      return res.json({
        success: true,
        message: "Shipment cancelled successfully",
        shipment
      });
    } catch (error) {
      console.error("Error cancelling shipment:", error);
      const providerFailure = error.message?.toLowerCase().includes("shipbubble");
      return res.status(providerFailure ? 502 : 500).json({
        success: false,
        message: providerFailure ? error.message : "Internal server error",
      });
    }
  }

  async trackShipment(req, res) {
    try {
      const shipment = await Shipment.findByPk(req.params.shipmentId);
      if (!shipment) return res.status(404).json({ success: false, message: "Shipment not found" });
      if (shipment.provider !== "shipbubble") {
        return res.status(400).json({ success: false, message: "Tracking refresh is only available for ShipBubble shipments" });
      }
      const tracking = await shippingManager.trackShipment(shipment);
      if (tracking.status && tracking.status !== shipment.status) {
        const normalizedStatus = LogisticsService.normalizeShipmentStatus(tracking.status);
        await shipment.update({ status: normalizedStatus, trackingUrl: tracking.trackingUrl || shipment.trackingUrl });
        await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);
        await ShipmentEvent.create({ shipmentId: shipment.id, status: normalizedStatus.toUpperCase(), note: "Status synchronized from ShipBubble" });
      }
      return res.json({ success: true, message: "Shipment tracking refreshed", data: { shipment, tracking } });
    } catch (error) {
      console.error("Error tracking shipment:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async markDelivered(req, res) {
    try {
      const shipment = await Shipment.findByPk(req.params.shipmentId);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }
      if (shipment.provider !== "internal") {
        return res.status(400).json({ success: false, message: "Only internal shipments can be marked delivered manually" });
      }
      if (shipment.status === "cancelled") {
        return res.status(400).json({ success: false, message: "Cancelled shipments cannot be delivered" });
      }
      if (shipment.status !== "delivered") {
        const normalizedStatus = LogisticsService.normalizeShipmentStatus("delivered");
        await shipment.update({ status: normalizedStatus });
        await ShipmentEvent.create({
          shipmentId: shipment.id,
          status: "DELIVERED",
          location: "Admin Panel",
          note: "Marked delivered by administrator",
        });
        await LogisticsService.syncOrderLogisticsStatus(shipment.orderId, normalizedStatus);

        // Mark order items delivered so the return window can open
        await OrderItem.update(
          { status: "DELIVERED" },
          { where: { orderId: shipment.orderId, isDeleted: false } }
        );
        // Fulfillments too
        const { OrderItemFulfillment } = require("../models");
        await OrderItemFulfillment.update(
          { status: "DELIVERED", statusUpdatedAt: new Date() },
          {
            where: {
              status: { [Op.notIn]: ["DELIVERED", "FAILED", "RETURNED"] },
              orderItemId: { [Op.in]: sequelize.literal(`(SELECT id FROM orderitems WHERE orderId = '${shipment.orderId}')`) },
            },
          }
        );

        await notifyCustomerStatus(shipment, "delivered", "Admin Panel");
      }
      return res.json({ success: true, message: "Internal shipment marked delivered", shipment });
    } catch (error) {
      console.error("Error marking shipment delivered:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update ONE fulfillment (product at a station) — admin override.
   * Rolls up item status and auto-completes the shipment when all are terminal.
   */
  async updateFulfillmentStatus(req, res) {
    const t = await sequelize.transaction();
    try {
      const { fulfillmentId } = req.params;
      const { status, note } = req.body;

      if (!status) throw new Error("Status is required");
      const normalized = String(status).toUpperCase();
      if (!["PENDING", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"].includes(normalized)) {
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
        where: { orderId: order.id, isDeleted: false },
        transaction: t,
      });
      if (!shipment) throw new Error("Shipment not found for this order");
      if (shipment.status === "cancelled") throw new Error("Shipment is cancelled");

      await fulfillment.update({
        status: normalized,
        statusNote: note || null,
        statusUpdatedAt: new Date(),
      }, { transaction: t });

      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: normalized,
        location: "Admin Panel",
        note: note || `Item fulfillment marked ${normalized.toLowerCase()} by admin`,
      }, { transaction: t });

      const { allTerminal } = await syncFulfillmentRollup(order.id, t);

      await t.commit();

      // Notify the customer (best-effort)
      try {
        const user = await User.findByPk(order.userId);
        if (user) {
          const productName = fulfillment.orderItem.productName || "ordered product";
          await notificationService.notify(user.id, {
            type: normalized === "DELIVERED" ? "ORDER_DELIVERED" : normalized === "FAILED" ? "SHIPMENT_FAILED" : "SHIPMENT_IN_TRANSIT",
            title: normalized === "DELIVERED" ? "Item Delivered!" : normalized === "FAILED" ? "Delivery Issue" : "Shipment Update",
            message: normalized === "DELIVERED"
              ? `Your item "${productName}" has been delivered.`
              : normalized === "FAILED"
                ? `Delivery of "${productName}" could not be completed.${note ? ` Reason: ${note}` : ""}`
                : `Your item "${productName}" is ${normalized.toLowerCase().replace("_", " ")}.`,
            metadata: { orderId: order.id, shipmentId: shipment.id, fulfillmentId: fulfillment.id },
            sendEmail: true,
          });
        }
      } catch (notifyErr) {
        console.error(`Admin fulfillment notification failed for ${fulfillment.id}:`, notifyErr.message);
      }

      return res.json({
        success: true,
        message: `Fulfillment marked ${normalized.toLowerCase()}`,
        data: { fulfillment, shipmentCompleted: allTerminal },
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error("Error updating fulfillment status:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Reassign a shipment to a different provider (e.g., Internal -> ShipBubble).
   */
  async reassignProvider(req, res) {
    try {
      const { id } = req.params;
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({ success: false, message: "Provider is required" });
      }

      const shipment = await Shipment.findByPk(id);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      const oldProvider = shipment.provider;
      if (oldProvider === provider) {
        return res.status(400).json({ success: false, message: "Shipment is already assigned to this provider" });
      }

      const t = await sequelize.transaction();
      try {
        // 1. Update the shipment provider
        await shipment.update({ provider, driverId: null }, { transaction: t });

        // 2. Handle provider-specific initialization
        if (provider === 'internal') {
          // Initialize internal tracking
          await ShipmentEvent.create({
            shipmentId: shipment.id,
            status: 'ORDER_RECEIVED',
            location: 'Central Hub',
            note: 'Reassigned to internal fleet',
          }, { transaction: t });
        } else {
          // If switching to ShipBubble, we would normally call the ShipBubble API here.
          // Since we're using the providerOrderId, we might need to generate one or
          // trigger a request to ShipBubble. For now, we'll mark it as pending.
          await shipment.update({ providerOrderId: null }, { transaction: t });
        }

        await t.commit();

        return res.json({
          success: true,
          message: `Shipment successfully reassigned from ${oldProvider} to ${provider}`,
          shipment
        });
      } catch (error) {
        await t.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error reassigning provider:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AdminDriverController();
