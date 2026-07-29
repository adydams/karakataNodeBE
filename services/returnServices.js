const { ReturnRequest, Order, OrderItem, WalletTransaction, Inventory, Store, SystemSetting } = require("../models");
const WalletService = require("./walletServices");
const PaymentService = require("./paymentServices"); // Assume this has the Paystack Refund wrapper
const InventoryService = require("./inventoryServices");
const sequelize = require("../db/database");

class ReturnService {
  /**
   * Customer files a return request.
   */
  async create(data) {
    const { orderItemId, customerId, reason } = data;
    const item = await OrderItem.findByPk(orderItemId);
    if (!item) throw new Error("Order item not found");

    const order = await Order.findByPk(item.orderId);
    const store = await Store.findByPk(order.storeId);

    // Find the corresponding SALE_CREDIT transaction
    const walletTx = await WalletTransaction.findOne({
      where: { orderItemId, storeId: store.id, type: "SALE_CREDIT" }
    });
    if (!walletTx) throw new Error("No payment transaction found for this item");

    return await ReturnRequest.create({
      orderId: order.id,
      orderItemId: item.id,
      customerId,
      storeId: store.id,
      pickupStationId: item.pickupStationId, // Default drop-off is the station it was from
      walletTransactionId: walletTx.id,
      reason,
      refundAmount: item.subtotal,
      status: "PENDING",
    });
  }

  /**
   * StoreAdmin approves return and classifies fault.
   */
  async approve(returnRequestId, faultParty) {
    const request = await ReturnRequest.findByPk(returnRequestId);
    if (!request) throw new Error("Return request not found");

    const order = await Order.findByPk(request.orderId);
    const store = await Store.findByPk(request.storeId);
    const setting = await SystemSetting.findOne();

    // 1. Validate return window
    const windowDays = store.returnWindowDays ?? setting.returnWindowDays;
    const expiryDate = new Date(order.paidAt);
    expiryDate.setDate(expiryDate.getDate() + windowDays);

    if (new Date() >= expiryDate) {
      throw new Error("Return window has expired");
    }

    const t = await sequelize.transaction();
    try {
      // 2. Reverse earnings from store wallet
      await WalletService.reverseEarning(request.walletTransactionId);

      // 3. Process Paystack Refund (Product subtotal only)
      const refund = await PaymentService.createRefund({
        orderId: order.id,
        amount: request.refundAmount,
      });

      // 4. Determine shipping bearer
      let returnShippingFee = 0;
      let bearer = "CUSTOMER";

      if (faultParty === "STORE") {
        bearer = "STORE";
        // In real scenario, call ShipBubble for return quote
        returnShippingFee = 500; // Mock return shipping cost

        // Deduct return shipping from store wallet
        const wallet = await Wallet.findOne({ where: { storeId: store.id }, transaction: t });

        await WalletTransaction.create({
          walletId: wallet.id,
          storeId: store.id,
          type: "RETURN_SHIPPING_DEBIT",
          status: "COMPLETED",
          netAmount: -returnShippingFee,
          description: `Return shipping fee for request ${request.id} (Store Fault)`,
        }, { transaction: t });

        await Wallet.decrement({ availableBalance: returnShippingFee }, { where: { id: wallet.id }, transaction: t });
      }

      await request.update({
        status: "APPROVED",
        faultParty,
        returnShippingBearer: bearer,
        returnShippingFee,
        refundReference: refund.reference,
        reviewedAt: new Date(),
      }, { transaction: t });

      await t.commit();
      return request;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async reject(returnRequestId, reason) {
    const request = await ReturnRequest.findByPk(returnRequestId);
    if (!request) throw new Error("Return request not found");

    return await request.update({
      status: "REJECTED",
      reason: `Rejected: ${reason}`,
      reviewedAt: new Date(),
    });
  }

  /**
   * StoreAdmin confirms receipt of the item.
   */
  async confirmRestock(returnRequestId) {
    const request = await ReturnRequest.findByPk(returnRequestId);
    if (!request) throw new Error("Return request not found");

    const item = await OrderItem.findByPk(request.orderItemId);

    const t = await sequelize.transaction();
    try {
      // 1. Restock inventory
      await InventoryService.restock(item.productId, request.pickupStationId, item.quantity, t);

      // 2. Update request status
      await request.update({
        restockConfirmedAt: new Date(),
        status: "COMPLETED",
      }, { transaction: t });

      await t.commit();
      return request;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new ReturnService();
