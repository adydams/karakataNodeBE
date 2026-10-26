const { Product, ReturnRequest, Order, OrderItem, Wallet, WalletTransaction, Inventory, Store, SystemSetting, Shipment, ShipmentEvent } = require("../models");
const { Op } = require("sequelize");
const WalletService = require("./walletServices");
const PaymentService = require("./paymentServices"); // Assume this has the Paystack Refund wrapper
const InventoryService = require("./inventoryServices");
const LogisticsService = require("./logisticsService");
const sequelize = require("../db/database");

class ReturnService {
  /**
   * Customer files a return request.
   */
  async create(data) {
    const { orderItemId, customerId, reason, description, evidence } = data;
    const item = await OrderItem.findByPk(orderItemId, {
      include: [{ model: Product, as: 'product' }]
    });
    if (!item) throw new Error("Order item not found");

    const order = await Order.findByPk(item.orderId);
    if (!order) throw new Error("Order not found");

    const storeId = item.product?.storeId;
    if (!storeId) throw new Error("Product is not associated with any store");

    const store = await Store.findByPk(storeId);
    if (!store) throw new Error("Store not found");

    // Validate return window before allowing request creation
    const setting = await SystemSetting.findOne();
    if (!setting) throw new Error("System settings not found. Please configure return window days.");
    const windowDays = store?.returnWindowDays ?? setting.returnWindowDays;
    if (windowDays === undefined || windowDays === null) throw new Error("Return window duration is not configured.");

    // Prevent duplicate active return requests for the same item
    const existingRequest = await ReturnRequest.findOne({
      where: {
        orderItemId,
        status: { [Op.in]: ["PENDING", "APPROVED"] }
      }
    });
    if (existingRequest) {
      throw new Error("A return request for this item is already pending or approved.");
    }

    // Use delivery date as the starting point for the return window
    const shipment = await Shipment.findOne({ where: { orderId: order.id }, include: [{ model: ShipmentEvent, as: 'events' }] });
    const deliveredEvent = shipment?.events?.find(e => e.status === "DELIVERED" || e.status === "delivered");
    const startDate = deliveredEvent ? deliveredEvent.createdAt : (shipment ? shipment.updatedAt : order.paidAt || order.createdAt);

    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + windowDays);

    if (new Date() >= expiryDate) {
      throw new Error(`The return window for this item has expired (Window: ${windowDays} days).`);
    }

    // Find the corresponding SALE_CREDIT transaction
    let walletTx = await WalletTransaction.findOne({
      where: { orderItemId, storeId: store.id, type: "SALE_CREDIT" }
    });

    // Fallback for legacy orders where orderItemId might be missing in WalletTransaction
    if (!walletTx) {
      walletTx = await WalletTransaction.findOne({
        where: {
          orderId: order.id,
          storeId: store.id,
          type: "SALE_CREDIT",
          grossAmount: item.subtotal
        }
      });
    }

    if (!walletTx) throw new Error("No payment transaction found for this item");

    const returnRequest = await ReturnRequest.create({
      orderId: order.id,
      orderItemId: item.id,
      customerId,
      storeId: store.id,
      pickupStationId: item.pickupStationId, // Default drop-off is the station it was from
      walletTransactionId: walletTx.id,
      reason,
      description,
      evidence,
      refundAmount: item.subtotal,
      status: "PENDING",
    });

    // Update item status to prevent it from showing as 'DELIVERED' in the customer's orders
    await OrderItem.update({ status: "RETURN_REQUESTED" }, { where: { id: item.id } });

    // --- Notifications ---
    try {
      const User = require('../models').User;
      const emailService = require('./emailService');
      const user = await User.findByPk(customerId);
      const storeOwner = await User.findByPk(store.ownerUserId);

      if (user?.email) {
        await emailService.sendNotificationEmail(
          user.email,
          "Return Request Initiated",
          `Hello ${user.fullName}, your return request for order #${order.id.slice(0, 8)} has been successfully submitted. Our team will review the evidence and update you shortly.`
        );
      }

      if (storeOwner?.email) {
        await emailService.sendNotificationEmail(
          storeOwner.email,
          "New Return Request Received",
          `Hello ${storeOwner.fullName}, a customer has initiated a return request for order #${order.id.slice(0, 8)}. Please review the request in your admin panel.`
        );
      }
    } catch (emailErr) {
      console.error("Return notification email failed:", emailErr.message);
      // We don't throw here because the return request was already created successfully
    }

    return returnRequest;
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

    const shipment = await Shipment.findOne({ where: { orderId: order.id }, include: [{ model: ShipmentEvent, as: 'events' }] });
    const deliveredEvent = shipment?.events?.find(e => e.status === "DELIVERED" || e.status === "delivered");
    const startDate = deliveredEvent ? deliveredEvent.createdAt : (shipment ? shipment.updatedAt : order.paidAt || order.createdAt);

    const expiryDate = new Date(startDate);
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

    const t = await sequelize.transaction();
    try {
      await request.update({
        status: "REJECTED",
        reason: `Rejected: ${reason}`,
        reviewedAt: new Date(),
      }, { transaction: t });

      // Reset item status back to DELIVERED so it appears in the delivered tab again
      await OrderItem.update({ status: "DELIVERED" }, { where: { id: request.orderItemId }, transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
    return request;
  }

  async getReturnRates(returnRequestId, { pickupDate, deliveryInstructions, senderPhone, receiverPhone } = {}) {
    const requestedPickupDate = pickupDate || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedPickupDate) || Number.isNaN(Date.parse(`${requestedPickupDate}T00:00:00Z`))) {
      throw new Error("pickupDate must use yyyy-mm-dd format");
    }
    const request = await ReturnRequest.findByPk(returnRequestId);
    if (!request) throw new Error("Return request not found");
    if (request.status !== "APPROVED") {
      throw new Error("Return rates can only be requested after return approval");
    }

    const shipment = await Shipment.findOne({ where: { orderId: request.orderId, provider: "shipbubble" } });
    if (!shipment?.providerOrderId) {
      throw new Error("No ShipBubble shipment is associated with this return");
    }

    if (shipment.status !== "delivered") {
      throw new Error("ShipBubble return rates are only available after shipment completion");
    }

    const deliveredEvent = await ShipmentEvent.findOne({
      where: { shipmentId: shipment.id, status: "DELIVERED" },
      order: [["createdAt", "DESC"]],
    });
    const completedAt = deliveredEvent?.createdAt || shipment.updatedAt;
    const deadline = new Date(completedAt);
    deadline.setDate(deadline.getDate() + 7);
    if (new Date() > deadline) {
      throw new Error("ShipBubble return-rate requests are only available within 7 days of delivery");
    }

    const rates = await LogisticsService.fetchReturnRates({
      providerOrderId: shipment.providerOrderId,
      pickupDate: requestedPickupDate,
      deliveryInstructions,
      senderPhone,
      receiverPhone,
    });
    if (rates?.request_token) {
      await request.update({ returnRateRequestToken: rates.request_token });
    }
    return rates;
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

      // 2. Update item status
      await OrderItem.update({ status: "RETURNED" }, { where: { id: item.id }, transaction: t });

      // 3. Update request status
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
