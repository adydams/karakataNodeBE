const OrderServices = require("../services/orderServices");
const emailService = require("../services/emailService");

class OrderController {
  /**
   * Checkout (create order + init payment)
   */
  async checkout(req, res) {
    try {
      const userId = req.user.id ; // 👈 replace with real auth
      const {
        shippingAddressId,
        gateway,
        email,
        shippingMethod,
        requestToken,
        serviceCode,
        courierId,
        chosenHubId
      } = req.body;

      const { order, paymentUrl, paymentInitializationRequired, paymentInitializationError } = await OrderServices.checkout(userId, {
        shippingAddressId,
        gateway,
        email,
        phone: req.body.phone,
        notes: req.body.notes,
        shippingMethod,
        requestToken,
        serviceCode,
        courierId,
        chosenHubId,
        shippingProvider: req.body.shippingProvider,
        discountCode: req.body.discountCode
      });

      return res.status(201).json({
        success: true,
        message: "Order created, proceed to payment",
        order,
        paymentUrl,
        paymentInitializationRequired,
        paymentInitializationError,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * Verify order payment
   */
  async verify(req, res) {
    try {
      const { orderId } = req.params;

      const { order, verified } = await OrderServices.verify(orderId);

      return res.status(200).json({
        success: verified,
        message: verified
          ? "Payment verified successfully"
          : "Payment verification failed",
        order,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getOrders(req, res) {
    try {
      const { role } = req.user;
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search || "";
      const status = req.query.status || "ALL";
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const result = await OrderServices.getAdminOrders({
        userId,
        role,
        limit,
        offset,
        search,
        status,
        startDate,
        endDate
      });

      return res.json({
        success: true,
        ...result
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  async getMyOrders(req, res) {
    try {
      const userId = req.user.id;
      const result = await OrderServices.getMyOrders(userId);
      return res.json({
        success: true,
        data: result
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  async retryPayment(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const result = await OrderServices.retryPayment(orderId, userId);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getCheckoutQuote(req, res) {
    try {
      const userId = req.user.id;
      const {
        shippingAddressId,
        shippingMethod,
        chosenHubId,
        discountCode,
        courierFee,
      } = req.body;

      const quote = await OrderServices.getCheckoutQuote(userId, {
        shippingAddressId,
        shippingMethod,
        chosenHubId,
        discountCode,
        courierFee,
      });

      return res.json({ success: true, data: quote });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getSummary(req, res) {
    try {
      const summary = await OrderServices.getOrderSummary();
      return res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  async getInvoice(req, res) {
    try {
      const { orderId } = req.params;

      // Use userId if available from auth middleware, otherwise it will be undefined
      const userId = req.user ? req.user.id : null;

      const order = await OrderServices.getInvoice(orderId, userId);

      res.json({
        success: true,
        data: order
      });

    } catch (err) {
      console.error("❌ Invoice error:", err.message);

      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  async getInvoicePdf(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user ? req.user.id : null;

      const invoiceData = await OrderServices.getInvoice(orderId, userId);

      const pdfDetails = {
        orderId: invoiceData.order.id,
        totalAmount: invoiceData.order.totalAmount,
        shippingFee: invoiceData.order.shippingFee,
        createdAt: invoiceData.order.createdAt,
        customerName: invoiceData.order.customer.fullName,
        customerEmail: invoiceData.order.customer.email,
        customerPhone: invoiceData.order.customer.phone,
        shippingAddress: invoiceData.order.shippingAddress?.address,
        shippingDetails: invoiceData.order.shippingDetails,
        status: invoiceData.order.status,
        items: invoiceData.items.map(item => ({
          productName: item.product.name,
          productImage: item.product.image,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        }))
      };

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Invoice_${orderId.slice(0, 8)}.pdf`);

      await emailService.streamInvoicePdf(pdfDetails, res);

    } catch (err) {
      console.error("❌ PDF Generation error:", err.message);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          message: err.message
        });
      }
    }
  }

  async getInvoiceBundlePdf(req, res) {
        try {
          const userId = req.user ? req.user.id : null;
          if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

          const orders = await OrderServices.getMyOrders(userId);
          const invoices = await Promise.all(orders.map(async order => {
            const invoiceData = await OrderServices.getInvoice(order.id, userId);
            return {
              orderId: invoiceData.order.id,
              totalAmount: invoiceData.order.totalAmount,
              shippingFee: invoiceData.order.shippingFee,
              createdAt: invoiceData.order.createdAt,
              customerName: invoiceData.order.customer.fullName,
              customerEmail: invoiceData.order.customer.email,
              customerPhone: invoiceData.order.customer.phone,
              shippingAddress: invoiceData.order.shippingAddress?.address,
              items: invoiceData.items.map(item => ({
                productName: item.product.name,
                productImage: item.product.image,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
              })),
            };
          }));

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "attachment; filename=Karakata_Invoices.pdf");
          await emailService.streamInvoiceBundlePdf(invoices, res);
        } catch (err) {
          console.error("Invoice bundle generation error:", err.message);
          if (!res.headersSent) res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new OrderController();
