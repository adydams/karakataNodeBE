// services/paymentServices.js
const axios = require('axios');
const { Payment, Order, User, sequelize } = require('../models');

class PaymentServices {
  // initialize payment for an order (creates Payment row with pending status)
  async initialize({ order, user, gateway, redirectUrl }) {
    if (!order) throw new Error('Order required');
    if (!user) throw new Error('User required');

    // Create DB payment record (pending)
    const payment = await Payment.create({
      orderId: order.id,
      userId: user.id,
      gateway,
      amount: order.totalAmount,
      currency: 'NGN',
      status: 'pending'
    });

    if (gateway === 'paystack') {
      // Paystack initialize
      const payload = {
        email: user.email || 'no-reply@example.com',
        amount: Math.round(Number(order.totalAmount) * 100), // kobo
        reference: `order_${order.id}_${Date.now()}`,
        callback_url: `${redirectUrl || process.env.BASE_URL}/api/payments/verify?gateway=paystack&orderId=${order.id}`
      };

      const res = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });

      if (!res.data || !res.data.status) throw new Error('Paystack init failed');

      // update payment record
      payment.reference = res.data.data.reference;
      payment.rawResponse = res.data;
      await payment.save();

      return { paymentUrl: res.data.data.authorization_url, payment };
    }

    if (gateway === 'flutterwave') {
      const tx_ref = `order_${order.id}_${Date.now()}`;
      const payload = {
        tx_ref,
        amount: Number(order.totalAmount),
        currency: 'NGN',
        redirect_url: `${redirectUrl || process.env.BASE_URL}/api/payments/verify?gateway=flutterwave&orderId=${order.id}`,
        customer: {
          email: user.email || 'no-reply@example.com',
          name: user.name || 'Customer'
        },
        meta: { orderId: order.id }
      };

      const res = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });

      if (!res.data || !res.data.status) throw new Error('Flutterwave init failed');

      payment.reference = tx_ref; // save tx_ref
      payment.rawResponse = res.data;
      await payment.save();

      return { paymentUrl: res.data.data.link, payment };
    }

    throw new Error('Unsupported gateway');
  }

  // verify by calling gateway API (used by manual verify endpoint)
  async verify({ gateway, reference }) {
    if (gateway === 'paystack') {
      const res = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      const success = res.data && res.data.data && res.data.data.status === 'success';
      return { success, raw: res.data };
    }

    if (gateway === 'flutterwave') {
      const res = await axios.get(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const success = res.data && res.data.data && res.data.data.status === 'successful';
      return { success, raw: res.data };
    }

    return { success: false };
  }

  // process webhook payload (internal update)
  async handleWebhookPaystack(rawBody, signatureHeader) {
    // verify signature using PAYSTACK_WEBHOOK_SECRET (HMAC SHA512)
    const crypto = require('crypto');
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (signatureHeader !== hash) {
      throw new Error('Invalid Paystack signature');
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    // find payment by reference
    const reference = data.reference;
    const payment = await Payment.findOne({ where: { reference } });
    if (!payment) {
      // optionally create payment record or log
      return { handled: false, reason: 'payment not found' };
    }

    if (event === 'charge.success' || (data && data.status === 'success')) {
      payment.status = 'success';
      payment.rawResponse = payload;
      await payment.save();
      // update order
      await Order.update({ paymentStatus: 'paid', status: 'completed', paymentReference: reference }, { where: { id: payment.orderId } });
      return { handled: true };
    }

    // other statuses
    if (data && data.status && data.status !== 'success') {
      payment.status = 'failed';
      payment.rawResponse = payload;
      await payment.save();
      await Order.update({ paymentStatus: 'failed', status: 'cancelled', paymentReference: reference }, { where: { id: payment.orderId } });
      return { handled: true };
    }

    return { handled: false };
  }

  async handleWebhookFlutterwave(rawBody, signatureHeader) {
    // Flutterwave sends header 'verif-hash' which you compare against FLW_WEBHOOK_SECRET
    const secret = process.env.FLW_WEBHOOK_SECRET;
    if (!signatureHeader || signatureHeader !== secret) {
      throw new Error('Invalid Flutterwave webhook signature');
    }

    const payload = JSON.parse(rawBody);
    // payload.data contains the transaction
    const tx = payload.data;
    const tx_ref = tx.tx_ref || (tx.meta && tx.meta.orderId) || null;
    // find payment by reference (we stored tx_ref in Payment.reference)
    const payment = await Payment.findOne({ where: { reference: tx_ref } });
    if (!payment) {
      return { handled: false, reason: 'payment not found' };
    }

    const status = tx.status; // 'successful' expected
    if (status === 'successful') {
      payment.status = 'success';
      payment.rawResponse = payload;
      await payment.save();
      await Order.update({ paymentStatus: 'paid', status: 'completed', paymentReference: tx_ref }, { where: { id: payment.orderId } });
      return { handled: true };
    } else {
      payment.status = 'failed';
      payment.rawResponse = payload;
      await payment.save();
      await Order.update({ paymentStatus: 'failed', status: 'cancelled', paymentReference: tx_ref }, { where: { id: payment.orderId } });
      return { handled: true };
    }
  }
}

module.exports = new PaymentServices();
