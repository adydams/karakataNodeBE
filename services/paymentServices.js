// services/paymentServices.js
const axios = require('axios');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const emailService = require('./emailService');
// OrderServices required locally to avoid circular dependency

const { Order, Payment, User, Cart, CartItem} = require('../models');

class PaymentServices {

  async initialize({ order, user, gateway, redirectUrl }) {
    if (!order) throw new Error('Order required');
    if (!user) throw new Error('User required');

    gateway = gateway?.toLowerCase();

    if (gateway === 'paystack') {
      const payload = {
        email: user.email || 'adydams@gmail.com',
        amount: Math.round(order.totalAmount * 100),
        reference: `order_${order.id}_${Date.now()}`,
        callback_url: `${redirectUrl}/api/payments/verify?gateway=paystack&orderId=${order.id}`
      };

      const res = await axios.post(
         `${process.env.PAYSTACK_URL}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!res.data?.status) throw new Error('Paystack init failed');

      return {
        paymentUrl: res.data.data.authorization_url,
        paymentReference: res.data.data.reference,
        rawResponse: res.data
      };
    }

    if (gateway === 'flutterwave') {
      const tx_ref = `order_${order.id}_${Date.now()}`;

      const res = await axios.post(
        `${process.env.FLUTTERWAVE_URL}/v3/payments`,
        {
          tx_ref,
          amount: order.totalAmount,
          currency: 'NGN',
          redirect_url: `${redirectUrl}/api/payments/verify?gateway=flutterwave&orderId=${order.id}`,
          customer: {
            email: user.email || 'no-reply@example.com',
            name: user.name || 'Customer'
          },
          customizations: {
            title: "Karakata Commerce",
            description: "Payment for Order #" + order.id
          },
          meta: { orderId: order.id }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          },
        }
      );

      if (!res.data || res.data.status !== 'success') {
        throw new Error('Flutterwave init failed');
      }

      return {
        paymentUrl: res.data.data.link,
        paymentReference: tx_ref,
        rawResponse: res.data
      };
    }

    throw new Error(`Unsupported payment gateway: ${gateway}`);
  }

  async verify({ gateway, reference }) {
    if (gateway === 'paystack') {
      const res = await axios.get(`${process.env.PAYSTACK_URL}/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      const success = res.data && res.data.data && res.data.data.status === 'success';
      return { success, raw: res.data };
    }

    if (gateway === 'flutterwave') {
      const res = await axios.get(`${process.env.FLUTTERWAVE_URL}/v3/transactions/${reference}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const success = res.data && res.data.data && res.data.data.status === 'successful';
      return { success, raw: res.data };
    }

    return { success: false };
  }

  async verifyPayment({ gateway, reference }) {
    const result = await this.verify({ gateway: gateway?.toLowerCase(), reference });
    return result.success;
  }

  async handleWebhookPaystack(rawBody, signatureHeader) {
    const crypto = require('crypto');
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (signatureHeader !== hash) {
      await auditService.log({
        userId: null,
        action: "PAYMENT_WEBHOOK_SIGNATURE_FAILURE",
        entityType: "Payment",
        entityId: "paystack",
        newValue: { signatureMismatch: true, rawBody: rawBody.slice(0, 100) }
      });
      throw new Error('Invalid Paystack signature');
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;
    const reference = data.reference;

    const payment = await Payment.findOne({ where: { reference } });

    if (!payment) {
      await auditService.log({
        userId: null,
        action: "PAYMENT_WEBHOOK_NOT_FOUND",
        entityType: "Payment",
        entityId: reference,
        newValue: { provider: "paystack", event }
      });
      return { handled: false };
    }

    if (payment.status === 'SUCCESS') {
      return { handled: true };
    }

    payment.rawResponse = payload;
    payment.gatewayResponse = {
      channel: data.channel,
      paidAt: data.paid_at,
      currency: data.currency,
      fees: data.fees,
      customerEmail: data.customer?.email,
    };

    if (event === 'refund.processed' || event === 'refund.failed') {
      const { RefundLog } = require("../models");
      const refundLog = await RefundLog.findOne({ where: { paystackRefundId: data.id || data.reference || data.refund_reference } });
      if (refundLog) {
        await refundLog.update({
          status: event === "refund.processed" ? "completed" : "failed",
          failureReason: event === "refund.failed" ? (data.failure_reason || "Paystack refund failed") : null,
        });
      }
      return { handled: Boolean(refundLog) };
    }

    if (event === 'charge.success') {
      payment.status = 'SUCCESS';
    } else {
      payment.status = 'FAILED';
    }

    await payment.save();

    const OrderServices = require('./orderServices');
    await OrderServices.verify(payment.orderId);

    await Order.update(
      {
        status: payment.status === 'SUCCESS' ? 'PAID' : 'FAILED',
        paymentStatus: payment.status,
        paymentReference: reference,
      },
      { where: { id: payment.orderId } }
    );

    if (payment.status === 'SUCCESS') {
      const order = await Order.findByPk(payment.orderId);
      if (order) {
        const user = await User.findByPk(order.userId);
        if (user) {
          await notificationService.notifyOrderPaid(user, order);

          // Send Invoice Email
          try {
            const OrderServices = require('./orderServices');
            const invoiceData = await OrderServices.prepareInvoiceEmailData(order.id);
            await emailService.sendInvoiceEmail(user.email, invoiceData);
          } catch (err) {
            console.error(`Failed to send invoice email for order ${order.id}:`, err.message);
          }
        }
        const userCart = await Cart.findOne({ where: { userId: order.userId }, isDeleted: false });
        if (userCart) {
          await CartItem.destroy({ where: { cartId: userCart.id } });
        }
      }
    }

    await auditService.log({
      userId: null,
      action: "PAYMENT_WEBHOOK_PROCESSED",
      entityType: "Payment",
      entityId: payment.id,
      oldValue: { status: 'PENDING' },
      newValue: { status: payment.status, event, reference }
    });

    return { handled: true };
  }

  async handleWebhookFlutterwave(rawBody, signatureHeader) {
    const secret = process.env.FLW_WEBHOOK_SECRET;
    if (!signatureHeader || signatureHeader !== secret) {
      await auditService.log({
        userId: null,
        action: "PAYMENT_WEBHOOK_SIGNATURE_FAILURE",
        entityType: "Payment",
        entityId: "flutterwave",
        newValue: { signatureMismatch: true }
      });
      throw new Error('Invalid Flutterwave webhook signature');
    }

    const payload = JSON.parse(rawBody);
    const tx = payload.data;
    const tx_ref = tx.tx_ref || (tx.meta && tx.meta.orderId) || null;

    const payment = await Payment.findOne({ where: { reference: tx_ref } });
    if (!payment) {
      await auditService.log({
        userId: null,
        action: "PAYMENT_WEBHOOK_NOT_FOUND",
        entityType: "Payment",
        entityId: tx_ref,
        newValue: { provider: "flutterwave" }
      });
      return { handled: false, reason: 'payment not found' };
    }

    const status = tx.status;
    if (status === 'successful') {
      payment.status = 'success';
      payment.rawResponse = payload;
      await payment.save();

      const OrderServices = require('./orderServices');
      await OrderServices.verify(payment.orderId);

      await Order.update({ paymentStatus: 'paid', status: 'completed', paymentReference: tx_ref }, { where: { id: payment.orderId } });

      const order = await Order.findByPk(payment.orderId);
      if (order) {
        const user = await User.findByPk(order.userId);
        if (user) {
          await notificationService.notifyOrderPaid(user, order);
        }
        const userCart = await Cart.findOne({ where: { userId: order.userId }, isDeleted: false });
        if (userCart) {
          await CartItem.destroy({ where: { cartId: userCart.id } });
        }
      }

      await auditService.log({
        userId: null,
        action: "PAYMENT_WEBHOOK_PROCESSED",
        entityType: "Payment",
        entityId: payment.id,
        oldValue: { status: 'PENDING' },
        newValue: { status: 'SUCCESS', provider: 'flutterwave', reference: tx_ref }
      });

      return { handled: true };
    } else {
      payment.status = 'failed';
      payment.rawResponse = payload;
      await payment.save();
      await Order.update({ paymentStatus: 'failed', status: 'cancelled', paymentReference: tx_ref }, { where: { id: payment.orderId } });

      await auditService.log({
        userId: null,
        action: "PAYMENT_WEBHOOK_PROCESSED",
        entityType: "Payment",
        entityId: payment.id,
        oldValue: { status: 'PENDING' },
        newValue: { status: 'FAILED', provider: 'flutterwave', reference: tx_ref }
      });

      return { handled: true };
    }
  }

  async createTransfer({ amount, accountNumber, bankCode, accountName }) {
    const payload = {
      amount: Math.round(amount * 100),
      destination: accountNumber,
      currency: 'NGN',
      reason: 'Store Payout',
      debug: false,
    };

    const res = await axios.post(
      `${process.env.PAYSTACK_URL}/transfer`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!res.data?.status) throw new Error('Paystack transfer failed');

    return {
      code: res.data.data.transfer_code,
      reference: res.data.data.reference,
    };
  }

  async createRefund({ orderId, amount }) {
    const payment = await Payment.findOne({ where: { orderId } });
    if (!payment || !payment.reference) throw new Error('Original payment reference not found');

    const payload = {
      amount: Math.round(amount * 100),
      transaction_id: payment.reference,
    };

    const res = await axios.post(
      `${process.env.PAYSTACK_URL}/refund`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!res.data?.status) throw new Error('Paystack refund failed');

    return {
      reference: res.data.data.refund_reference,
      status: res.data.data.status,
    };
  }
}

module.exports = new PaymentServices();
