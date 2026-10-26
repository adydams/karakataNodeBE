// Clears order-related test data without removing users, products, stores,
// inventory, addresses, permissions, or application settings.
//
// Dry run:
//   node scripts/clear_order_data.js
//
// Apply permanently:
//   node scripts/clear_order_data.js --apply

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const {
  Order,
  OrderItem,
  OrderItemFulfillment,
  Shipment,
  ShipmentEvent,
  Payment,
  Notification,
  ReturnRequest,
  WalletTransaction,
  Wallet,
} = require("../models");
const RefundLog = require("../models/refundLogModel");
const MissedApprovalLog = require("../models/missedApprovalLogModel");
const { Op } = require("sequelize");
const sequelize = require("../db/database");

function parseArgs() {
  return { apply: process.argv.slice(2).includes("--apply") };
}

async function main() {
  const { apply } = parseArgs();
  console.log(`Order data cleanup (${apply ? "APPLY" : "DRY RUN"})`);

  try {
    const orders = await Order.findAll({ attributes: ["id"] });
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length === 0) {
      console.log("No orders found. Nothing to clear.");
      return;
    }

    const orderItems = await OrderItem.findAll({
      attributes: ["id"],
      where: { orderId: { [Op.in]: orderIds } },
    });
    const orderItemIds = orderItems.map((item) => item.id);

    const shipments = await Shipment.findAll({
      attributes: ["id"],
      where: { orderId: { [Op.in]: orderIds } },
    });
    const shipmentIds = shipments.map((shipment) => shipment.id);

    const walletTransactions = await WalletTransaction.findAll({
      attributes: ["id", "walletId"],
      where: {
        [Op.or]: [
          { orderId: { [Op.in]: orderIds } },
          ...(orderItemIds.length ? [{ orderItemId: { [Op.in]: orderItemIds } }] : []),
        ],
      },
    });
    const walletIds = [...new Set(walletTransactions.map((transaction) => transaction.walletId))];

    const counts = {
      orders: orderIds.length,
      orderItems: orderItemIds.length,
      shipments: shipmentIds.length,
      shipmentEvents: shipmentIds.length
        ? await ShipmentEvent.count({ where: { shipmentId: { [Op.in]: shipmentIds } } })
        : 0,
      payments: await Payment.count({ where: { orderId: { [Op.in]: orderIds } } }),
      returns: await ReturnRequest.count({ where: { orderId: { [Op.in]: orderIds } } }),
      refunds: orderItemIds.length
        ? await RefundLog.count({ where: { orderItemId: { [Op.in]: orderItemIds } } })
        : 0,
      missedApprovals: orderItemIds.length
        ? await MissedApprovalLog.count({ where: { orderItemId: { [Op.in]: orderItemIds } } })
        : 0,
      fulfillments: orderItemIds.length
        ? await OrderItemFulfillment.count({ where: { orderItemId: { [Op.in]: orderItemIds } } })
        : 0,
      walletTransactions: walletTransactions.length,
      affectedWallets: walletIds.length,
    };

    console.table(counts);

    if (!apply) {
      console.log("Dry run complete. No data was changed.");
      console.log("Re-run with --apply to permanently clear these order records.");
      return;
    }

    await sequelize.transaction(async (transaction) => {
      if (shipmentIds.length) {
        await ShipmentEvent.destroy({
          where: { shipmentId: { [Op.in]: shipmentIds } },
          transaction,
        });
      }

      if (orderIds.length) {
        await Payment.destroy({
          where: { orderId: { [Op.in]: orderIds } },
          transaction,
        });
        await ReturnRequest.destroy({
          where: { orderId: { [Op.in]: orderIds } },
          transaction,
        });
        await Notification.destroy({
          where: {
            [Op.or]: orderIds.map((orderId) => ({
              metadata: { [Op.like]: `%${orderId}%` },
            })),
          },
          transaction,
        });
      }

      if (orderItemIds.length) {
        await RefundLog.destroy({
          where: { orderItemId: { [Op.in]: orderItemIds } },
          transaction,
        });
        await MissedApprovalLog.destroy({
          where: { orderItemId: { [Op.in]: orderItemIds } },
          transaction,
        });
        await OrderItemFulfillment.destroy({
          where: { orderItemId: { [Op.in]: orderItemIds } },
          transaction,
        });
      }

      if (walletTransactions.length) {
        await WalletTransaction.destroy({
          where: { id: { [Op.in]: walletTransactions.map((item) => item.id) } },
          transaction,
        });
        await Wallet.update(
          {
            availableBalance: 0,
            pendingBalance: 0,
            lifetimeEarnings: 0,
          },
          {
            where: { id: { [Op.in]: walletIds } },
            transaction,
          }
        );
      }

      if (shipmentIds.length) {
        await Shipment.destroy({
          where: { id: { [Op.in]: shipmentIds } },
          transaction,
        });
      }
      if (orderItemIds.length) {
        await OrderItem.destroy({
          where: { id: { [Op.in]: orderItemIds } },
          transaction,
        });
      }
      await Order.destroy({
        where: { id: { [Op.in]: orderIds } },
        transaction,
      });
    });

    console.log("Order data cleanup completed successfully.");
    console.log("Preserved users, products, stores, inventory, addresses, settings, and payouts.");
  } catch (error) {
    console.error("Order data cleanup failed:", error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
