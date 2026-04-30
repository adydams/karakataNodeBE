// services/paymentServices.js
const axios = require('axios');

const { sequelize , Order, Payment, User} = require('../models');

class PaymentServices {

  async initialize({ order, user, gateway, redirectUrl }) {
    //console.log("🚀 Initializing payment...");
    //console.log("Gateway:", gateway);
    //console.log("Order ID:", order.id);
    //console.log("User email:", user.email);
  if (!order) throw new Error('Order required');
  if (!user) throw new Error('User required');

  gateway = gateway?.toLowerCase();
  const payment = await Payment.create({
    orderId: order.id,
    userId: user.id,
    gateway,
    amount: order.totalAmount,
    currency: 'NGN',
    status: 'PENDING'
  });
  
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

    payment.reference = res.data.data.reference;
    payment.paymentUrl = res.data.data.authorization_url; 
    payment.rawResponse = res.data;
    await payment.save();

    return {
      paymentUrl: res.data.data.authorization_url,
      payment
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

    payment.reference = tx_ref;
    payment.paymentUrl = res.data.data.link; 
    payment.rawResponse = res.data;
    //console.log("🔗 Payment URL:", payment.paymentUrl);
    await payment.save();

    return {
      paymentUrl: res.data.data.link,
      payment
    };
  } 

  throw new Error(`Unsupported payment gateway: ${gateway}`);
}

  

  // verify by calling gateway API (used by manual verify endpoint)
  async verify({ gateway, reference }) {
    if (gateway === 'paystack') {
      const res = await axios.get(`${process.env.PAYSTACK_URL}/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      //console.log("Paystack verify response endpoint:", res.data);
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

  // // process webhook payload (internal update)
  // async handleWebhookPaystack(rawBody, signatureHeader) {
  //   // verify signature using PAYSTACK_WEBHOOK_SECRET (HMAC SHA512)
  //   const crypto = require('crypto');
  //   const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  //   const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  //   if (signatureHeader !== hash) {
  //     throw new Error('Invalid Paystack signature');
  //   }

  //   const payload = JSON.parse(rawBody);
  //   const event = payload.event;
  //   const data = payload.data;

  //   // find payment by reference
  //   const reference = data.reference;
  //   const payment = await Payment.findOne({ where: { reference } });
  //   if (!payment) {
  //     // optionally create payment record or log
  //     return { handled: false, reason: 'payment not found for reference' };
  //   }

  //   if (event === 'charge.success' || (data && data.status === 'success')) {
  //     payment.status = 'success';
  //     payment.rawResponse = payload;
  //     await payment.save();
  //     // update order
  //     await Order.update({ paymentStatus: 'paid', status: 'completed', paymentReference: reference }, { where: { id: payment.orderId } });
  //     return { handled: true };
  //   }

  //   // other statuses
  //   if (data && data.status && data.status !== 'success') {
  //     payment.status = 'failed';
  //     payment.rawResponse = payload;
  //     await payment.save();
  //     await Order.update({ paymentStatus: 'failed', status: 'cancelled', paymentReference: reference }, { where: { id: payment.orderId } });
  //     return { handled: true };
  //   }

  //   return { handled: false };
  // }
  async handleWebhookPaystack(rawBody, signatureHeader) {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  //console.log("📩 Webhook received");
  //console.log("Headers:", req.headers);
  //console.log("Raw body:", req.body.toString());
  if (signatureHeader !== hash) {
    throw new Error('Invalid Paystack signature');
  }

  //console.log("🔐 Verifying Paystack signature...");
  //console.log("Incoming signature:", signatureHeader);
  //console.log("Generated hash:", hash);
  const payload = JSON.parse(rawBody);
  const event = payload.event;
  const data = payload.data;

  const reference = data.reference;

  //console.log("📦 Event:", event);
  //console.log("💳 Reference:", data.reference);
  //console.log("💵 Amount:", data.amount);
  //console.log("📧 Customer:", data.customer?.email);


  const payment = await Payment.findOne({ where: { reference } });

  //console.log("🧾 Payment found:", payment?.id);
  //console.log("📌 Order ID:", payment?.orderId);
  if (!payment) {
    //console.log("Payment not found for reference:", reference);
    return { handled: false };
  }

  // 🔥 Prevent duplicate processing
  if (payment.status === 'SUCCESS') {
    return { handled: true };
  }

  // 🔥 SAVE FULL PAYSTACK DATA
  payment.rawResponse = payload;
  payment.gatewayResponse = {
    channel: data.channel,
    paidAt: data.paid_at,
    currency: data.currency,
    fees: data.fees,
    customerEmail: data.customer?.email,
  };

  if (event === 'charge.success') {
    payment.status = 'SUCCESS';
  } else {
    payment.status = 'FAILED';
  }

  await payment.save();

  // 🔥 Update Order
  await Order.update(
    {
      status: payment.status === 'SUCCESS' ? 'PAID' : 'FAILED',
      paymentStatus: payment.status,
      paymentReference: reference,
    },
    { where: { id: payment.orderId } }
  );
   //console.log("✅ Payment updated:", payment.status);
   //console.log("✅ Order updated to:", payment.status === "SUCCESS" ? "PAID" : "FAILED");
  return { handled: true };
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
