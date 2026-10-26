// Repair historical order/shipment status mismatches.
//
// Usage:
//   node scripts/repair_order_statuses.js
//   node scripts/repair_order_statuses.js --apply
//   node scripts/repair_order_statuses.js --apply --orderId=ORDER_ID
//
// The default mode is a dry run. Tracking events are never deleted; when an
// existing current status must be changed, a corrective event is appended.

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { Order, Shipment, ShipmentEvent } = require("../models");
const sequelize = require("../db/database");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const shipmentStatusMap = {
  pending: "pending",
  processing: "processing",
  accepted: "accepted",
  assigned: "assigned",
  order_received: "order_received",
  picked_up: "picked_up",
  shipped: "shipped",
  in_transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  completed: "delivered",
  returned: "returned",
  failed: "failed",
  delivery_failed: "failed",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const logisticsStatusMap = {
  pending: "PROCESSING",
  processing: "PROCESSING",
  accepted: "PROCESSING",
  assigned: "PROCESSING",
  order_received: "PROCESSING",
  picked_up: "IN_TRANSIT",
  shipped: "SHIPPED",
  in_transit: "IN_TRANSIT",
  out_for_delivery: "IN_TRANSIT",
  delivered: "DELIVERED",
  returned: "PROCESSING",
  failed: "DELIVERY_FAILED",
  cancelled: "DELIVERY_FAILED",
};

function parseArgs() {
  const options = { apply: false, orderId: null };

  for (const argument of process.argv.slice(2)) {
    if (argument === "--apply") options.apply = true;
    if (argument.startsWith("--orderId=")) {
      options.orderId = argument.slice("--orderId=".length);
    }
  }

  return options;
}

function resolveShipmentStatus(order, shipment) {
  const orderStatus = normalize(order.status);

  // Payment state has priority. An unpaid order must never remain deliverable.
  if (orderStatus === "failed" || orderStatus === "payment_failed") {
    return "failed";
  }

  if (["cancelled", "canceled"].includes(orderStatus)) {
    return "cancelled";
  }

  const currentShipmentStatus = normalize(shipment?.status);
  const normalizedCurrentStatus = shipmentStatusMap[currentShipmentStatus] || "pending";
  const latestEvent = [...(shipment.events || [])]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
  const latestEventStatus = shipmentStatusMap[normalize(latestEvent?.status)];

  // Historical internal shipments were able to record DELIVERED events without
  // updating shipments.status. Reconcile only a paid order and only when the
  // latest event is a terminal state; future writes use shipments.status.
  if (
    orderStatus === "paid" &&
    ["delivered", "failed", "cancelled"].includes(latestEventStatus) &&
    !["delivered", "failed", "cancelled"].includes(normalizedCurrentStatus)
  ) {
    return latestEventStatus;
  }

  return normalizedCurrentStatus;
}

function shouldAppendEvent(previousStatus, nextStatus) {
  return Boolean(previousStatus && nextStatus && previousStatus !== nextStatus);
}

function findEventWarnings(order, shipment) {
  const warnings = [];
  const currentStatus = normalize(shipment.status);
  const eventStatuses = (shipment.events || []).map((event) => normalize(event.status));
  const hasDeliveredEvent = eventStatuses.includes("delivered");
  const hasFailedEvent = eventStatuses.includes("failed") || eventStatuses.includes("delivery_failed");
  const orderStatus = normalize(order.status);

  if (hasDeliveredEvent && currentStatus !== "delivered") {
    warnings.push(
      `Shipment current status is "${shipment.status}" but its event history contains DELIVERED`
    );
  }

  if (["failed", "payment_failed", "cancelled", "canceled"].includes(orderStatus) && hasDeliveredEvent) {
    warnings.push(
      `Order status is "${order.status}" but its event history contains DELIVERED`
    );
  }

  if (hasFailedEvent && currentStatus === "delivered") {
    warnings.push(
      `Shipment current status is DELIVERED but its event history contains a failure event`
    );
  }

  return warnings;
}

async function repairOrder(order, apply) {
  const shipments = order.shipments || [];
  const changes = [];
  const warnings = [];

  if (shipments.length === 0) {
    return { changes, warnings };
  }

  const shipment = shipments[0];
  warnings.push(...findEventWarnings(order, shipment));
  const previousShipmentStatus = normalize(shipment.status);
  const nextShipmentStatus = resolveShipmentStatus(order, shipment);
  const nextLogisticsStatus = logisticsStatusMap[nextShipmentStatus] || "PROCESSING";
  const previousLogisticsStatus = normalize(order.logisticsStatus);

  if (previousShipmentStatus !== nextShipmentStatus) {
    changes.push({
      type: "shipment",
      id: shipment.id,
      from: shipment.status,
      to: nextShipmentStatus,
      reason: "Normalized current shipment status or enforced payment/cancellation state",
    });
  }

  if (previousLogisticsStatus !== normalize(nextLogisticsStatus)) {
    changes.push({
      type: "order",
      id: order.id,
      from: order.logisticsStatus,
      to: nextLogisticsStatus,
      reason: "Synchronized order logistics status from the current shipment status",
    });
  }

  if (!apply || changes.length === 0) {
    return { changes, warnings };
  }

  const previousShipmentValue = shipment.status;
  await sequelize.transaction(async (transaction) => {
    if (previousShipmentStatus !== nextShipmentStatus) {
      await shipment.update({ status: nextShipmentStatus }, { transaction });

      if (shouldAppendEvent(previousShipmentStatus, nextShipmentStatus)) {
        await ShipmentEvent.create(
          {
            shipmentId: shipment.id,
            status: nextShipmentStatus.toUpperCase(),
            location: "Karakata data repair",
            note: `Historical status repair: ${previousShipmentValue} -> ${nextShipmentStatus}`,
          },
          { transaction }
        );
      }
    }

    if (previousLogisticsStatus !== normalize(nextLogisticsStatus)) {
      await order.update({ logisticsStatus: nextLogisticsStatus }, { transaction });
    }
  });

  return { changes, warnings };
}

async function main() {
  const { apply, orderId } = parseArgs();
  const where = orderId ? { id: orderId } : {};

  console.log(`Order status repair (${apply ? "APPLY" : "DRY RUN"})`);
  if (orderId) console.log(`Limited to order: ${orderId}`);

  try {
    const orders = await Order.findAll({
      where,
      include: [
        {
          model: Shipment,
          as: "shipments",
          required: false,
          where: { isDeleted: false },
          include: [{ model: ShipmentEvent, as: "events", required: false }],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    let changedOrders = 0;
    let changedFields = 0;
    let warningCount = 0;

    for (const order of orders) {
      const { changes, warnings } = await repairOrder(order, apply);
      if (warnings.length > 0) {
        warningCount += warnings.length;
        console.log(`\nWARNING Order ${order.id}`);
        for (const warning of warnings) {
          console.log(`  ${warning}`);
        }
      }

      if (changes.length === 0) continue;

      changedOrders++;
      changedFields += changes.length;
      console.log(`\nOrder ${order.id} (${order.status})`);
      for (const change of changes) {
        console.log(
          `  ${change.type} ${change.id || ""}: ${change.from || "(empty)"} -> ${change.to || "(none)"}`
        );
        console.log(`    ${change.reason}`);
      }
    }

    console.log(`\nChecked: ${orders.length} order(s)`);
    console.log(`Orders needing changes: ${changedOrders}`);
    console.log(`Fields needing changes: ${changedFields}`);
    console.log(`Historical conflicts found: ${warningCount}`);
    if (!apply) {
      console.log("\nNo data was changed. Re-run with --apply to commit these repairs.");
    }
  } catch (error) {
    console.error("Status repair failed:", error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
