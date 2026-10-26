const { Op } = require("sequelize");
const {
  sequelize,
  OrderItem,
  Order,
  OrderItemFulfillment,
  RefundLog,
  WalletTransaction,
  Product,
  Store,
  MissedApprovalLog,
  User,
  Role,
} = require("../models");
const InventoryService = require("./inventoryServices");
const PaymentService = require("./paymentServices");
const WalletService = require("./walletServices");
const NotificationService = require("./notificationService");

class OrderApprovalService {
  async recalculateOrder(order, removedAmount, transaction) {
    const remaining = await OrderItem.findAll({
      where: { orderId: order.id, isDeleted: false },
      attributes: ["subtotal", "price", "quantity"],
      transaction,
    });
    const beforeSubtotal = remaining.reduce((sum, item) => sum + Number(item.subtotal || Number(item.price) * item.quantity), 0) + removedAmount;
    const shippingFee = Number(order.shippingFee || 0);
    const removedShipping = beforeSubtotal > 0 ? shippingFee * (removedAmount / beforeSubtotal) : shippingFee;
    const snapshot = order.shippingSnapshot && typeof order.shippingSnapshot === "object"
      ? { ...order.shippingSnapshot, recalculatedAt: new Date().toISOString(), removedAmount }
      : order.shippingSnapshot;
    await order.update({
      totalAmount: Math.max(0, Number(order.totalAmount) - removedAmount - removedShipping),
      shippingFee: Math.max(0, shippingFee - removedShipping),
      shippingSnapshot: snapshot,
    }, { transaction });
  }

  async processRejectedItem(itemId, reason, status = "expired") {
    const transaction = await sequelize.transaction();
    let item;
    try {
      item = await OrderItem.findByPk(itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        include: [
          { model: OrderItemFulfillment, as: "fulfillments" },
          { model: Order, as: "order" },
          { model: Product, as: "product", include: [{ model: Store, as: "store" }] },
        ],
      });
      if (!item) throw new Error("Order item not found");
      if (item.approvalStatus !== "pending") return { skipped: true, item };
      for (const fulfillment of item.fulfillments || []) {
        await InventoryService.releaseReservation(item.productId, fulfillment.pickupStationId, fulfillment.quantity, transaction);
      }
      const amount = Number(item.subtotal || Number(item.price) * item.quantity);
      await item.update({
        approvalStatus: status,
        approvalRespondedAt: new Date(),
        approvalReason: reason,
        isDeleted: true,
      }, { transaction });
      if (item.order) await this.recalculateOrder(item.order, amount, transaction);
      await transaction.commit();

      const existingRefund = await RefundLog.findOne({ where: { orderItemId: item.id, reason: "expired_approval" } });
      await MissedApprovalLog.findOrCreate({
        where: { orderItemId: item.id },
        defaults: { productId: item.productId, storeId: item.product?.storeId || item.product?.store?.id },
      });
      const refundLog = existingRefund || await RefundLog.create({
        orderItemId: item.id,
        amount,
        reason: "expired_approval",
        status: "initiated",
      });
      await this.reverseWalletCredit(item.id);
      await this.initiateRefund(refundLog, item.orderId, amount);
      if (item.product?.store?.ownerUserId) {
        await NotificationService.notify(item.product.store.ownerUserId, {
          type: "ORDER_ITEM_APPROVAL_MISSED",
          title: "Order approval missed",
          message: `${item.product.name} was removed because it was not approved in time.`,
          metadata: { orderItemId: item.id, orderId: item.orderId },
          sendEmail: true,
        });
      }
      return { item, refundLog };
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async reverseWalletCredit(orderItemId) {
    const saleCredit = await WalletTransaction.findOne({ where: { orderItemId, type: "SALE_CREDIT", status: { [Op.ne]: "CANCELLED" } } });
    if (saleCredit) await WalletService.reverseEarning(saleCredit.id);
  }

  async initiateRefund(refundLog, orderId, amount) {
    if (["processing", "completed"].includes(refundLog.status)) return refundLog;
    try {
      const refund = await PaymentService.createRefund({ orderId, amount });
      await refundLog.update({
        paystackRefundId: refund.reference,
        status: refund.status === "success" ? "processing" : "initiated",
        retryCount: Number(refundLog.retryCount || 0) + 1,
        lastAttemptAt: new Date(),
        failureReason: null,
      });
    } catch (error) {
      await refundLog.update({
        status: "failed",
        retryCount: Number(refundLog.retryCount || 0) + 1,
        lastAttemptAt: new Date(),
        failureReason: error.message,
      });
      const admins = await User.findAll({
        include: [{ model: Role, as: "role", where: { name: { [Op.in]: ["Admin", "SuperAdmin", "SystemAdmin"] } } }],
        attributes: ["id"],
      });
      await Promise.all(admins.map((admin) => NotificationService.notify(admin.id, {
        type: "REFUND_FAILED",
        title: "Refund requires attention",
        message: `Refund for order item ${refundLog.orderItemId} failed and will be retried.`,
        metadata: { refundLogId: refundLog.id, error: error.message },
      })));
    }
    return refundLog;
  }

  async expirePendingItems() {
    const items = await OrderItem.findAll({
      where: { approvalStatus: "pending", approvalDeadline: { [Op.lt]: new Date() }, isDeleted: false },
      attributes: ["id"],
      limit: 100,
    });
    let processed = 0;
    for (const item of items) {
      try {
        const result = await this.processRejectedItem(item.id, "Approval deadline passed");
        if (!result.skipped) processed += 1;
      } catch (error) {
        console.error(`[OrderApproval] Expiry failed for ${item.id}:`, error);
      }
    }
    return processed;
  }

  async retryFailedRefunds() {
    const logs = await RefundLog.findAll({
      where: { status: "failed", retryCount: { [Op.lt]: 3 } },
      include: [{ model: OrderItem, as: "orderItem", attributes: ["orderId"] }],
      limit: 100,
    });
    for (const log of logs) {
      await this.initiateRefund(log, log.orderItem.orderId, Number(log.amount));
    }
    return logs.length;
  }
}

module.exports = new OrderApprovalService();
