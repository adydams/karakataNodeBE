// controllers/logisticsController.js
const LogisticsService = require("../services/logisticsService");

class LogisticsController {
  /**
   * POST /api/logistics/rates
   * Customer selects a shipping address → we return courier options + prices.
   *
   * Body: {
   *   shippingAddressId,
   *   packageItems: [{ name, description, unit_weight, unit_amount, quantity }],
   *   packageDimension: { length, width, height },  // CM
   *   categoryId,        // from GET /api/logistics/categories
   *   pickupDate,        // optional "yyyy-mm-dd"
   *   serviceType,       // optional "pickup" | "dropoff"
   * }
   */
  async getRates(req, res) {
    try {
    const {
      shippingAddressId,
      packageItems,
      packageDimension,
      categoryId,
      pickupDate,
      serviceType,
    } = req.body;
    
    console.log("[LogisticsController] getRates called", req.body);
    // ✅ VALIDATION
    const missingFields = [];
    if (!shippingAddressId) missingFields.push("shippingAddressId");
    if (!Array.isArray(packageItems) || packageItems.length === 0) missingFields.push("packageItems");
    if (!packageDimension) missingFields.push("packageDimension");
    if (!categoryId) {
      console.warn("[LogisticsController] categoryId missing, service will use fallback");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid request payload. Missing fields: ${missingFields.join(", ")}`,
      });
    }

    // ✅ VALID serviceType (MATCH SHIPBUBBLE)
    const validServiceTypes = ["pickup", "dropoff"];

    if (serviceType && !validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: "serviceType must be pickup or dropoff",
      });
    }


    console.log("RATE REQUEST:", {
      shippingAddressId,
      packageItems,
      packageDimension,
      categoryId,
      pickupDate,
      serviceType,
    });
    // ✅ FIXED PAYLOAD
    let ratesData = await LogisticsService.getShippingRates({
      receiverAddressId: shippingAddressId,
      packageItems,
      packageDimension,
      categoryId,
      pickupDate,
      serviceType,
    });

    // Apply platform markup so frontend sees final display fee
    try {
      const { SystemSetting } = require('../models');
      const setting = await SystemSetting.findOne();
      const markupRate = (setting?.shippingMarkupPercent || 0) / 100;

      if (ratesData && Array.isArray(ratesData.couriers)) {
        ratesData.couriers = ratesData.couriers.map(c => {
          const isInternal = c.id === 'karakata-internal' || c.raw?.provider === 'internal';
          // Internal fleet is priced by ShippingPriceCalculator and charged
          // as-is at checkout; only external couriers get the platform markup.
          const markupAmount = isInternal ? 0 : parseFloat((c.fee * markupRate).toFixed(2));
          return {
            ...c,
            rawFee: c.fee,
            markupAmount,
            displayFee: parseFloat((c.fee + markupAmount).toFixed(2)),
            fee: parseFloat((c.fee + markupAmount).toFixed(2)),
          };
        });
      }
    } catch (err) {
      console.error('Failed to apply shipping markup:', err.message || err);
    }

    return res.status(200).json({
      success: true,
      data: ratesData,
      ...(ratesData.internalFleetUnavailable
        ? { internalFleetUnavailable: ratesData.internalFleetUnavailable }
        : {}),
    });

  } catch (err) {
    console.error("getRates error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

  /**
   * POST /api/logistics/book
   * Customer picks a courier from the rates response → book the shipment.
   *
   * Body: {
   *   orderId,
   *   requestToken,   // from getRates response
   *   serviceCode,    // e.g. "darum"
   *   courierId,      // e.g. "darum" or numeric id
   *   courierName,
   *   shippingFee,
   *   deliveryEta,
   *   insuranceCode,  // optional
   * }
   */
  async bookShipment(req, res) {
    try {
      const {
        orderId,
        requestToken,
        serviceCode,
        courierId,
        courierName,
        shippingFee,
        deliveryEta,
        insuranceCode,
      } = req.body;

      if (!orderId || !requestToken || !serviceCode || !courierId) {
        return res.status(400).json({
          success: false,
          message: "orderId, requestToken, serviceCode, and courierId are required",
        });
      }

      const shipment = await LogisticsService.createShipment({
        orderId,
        requestToken,
        serviceCode,
        courierId,
        courierName,
        shippingFee,
        deliveryEta,
        insuranceCode,
      });

      return res.status(201).json({
        success: true,
        message: "Shipment created successfully",
        data: shipment,
      });
    } catch (err) {
      console.error("bookShipment error:", err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/logistics/shipment/:orderId
   * Get shipment details for an order.
   */
  async getShipment(req, res) {
    try {
      const { orderId } = req.params;
      const shipment = await LogisticsService.getShipmentByOrderId(orderId);
      return res.status(200).json({ success: true, data: shipment });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/logistics/webhook
   * ShipBubble webhook — update shipment status automatically.
   * Register this URL in your ShipBubble dashboard.
   *
   * ShipBubble sends a status payload and signs the raw body with x-ship-signature.
   */
  async webhook(req, res) {
    try {
      const secret = process.env.SHIPBUBBLE_SECRET_KEY;
      const signature = req.headers["x-ship-signature"];
      if (secret) {
        const crypto = require("crypto");
        const expected = crypto.createHmac("sha512", secret).update(req.rawBody || "").digest("hex");
        if (!signature || signature.length !== expected.length ||
            !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          return res.status(401).json({ message: "Invalid ShipBubble webhook signature" });
        }
      }

      const { order_id, status } = req.body;

      if (!order_id || !status) {
        return res.status(400).json({ message: "Invalid webhook payload" });
      }

      console.log(`[ShipBubble Webhook] order_id=${order_id} status=${status}`);

      await LogisticsService.updateShipmentStatus(order_id, status);

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err.message);
      return res.status(500).json({ received: false, message: err.message });
    }
  }

  /**
   * POST /api/logistics/validate-address/:addressId
   * Manually trigger address validation with ShipBubble (admin/debug use).
   */
  async validateAddress(req, res) {
    try {
      const { addressId } = req.params;
      const result = await LogisticsService.validateAndRegisterAddress(addressId);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/logistics/categories
   * Package categories from ShipBubble.
   */
  async getCategories(req, res) {
    try {
      console.log("Fetching categories from ShipBubble...");
      const data = await LogisticsService.getCategories();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/logistics/boxes
   * Package box sizes from ShipBubble.
   */
  async getBoxSizes(req, res) {
    try {
      const data = await LogisticsService.getBoxSizes();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/logistics/couriers
   * Available couriers from ShipBubble.
   */
  async getCouriers(req, res) {
    try {
      const data = await LogisticsService.getCouriers();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/logistics/wallet
   * ShipBubble wallet balance.
   */
  async getWalletBalance(req, res) {
    try {
      const data = await LogisticsService.getWalletBalance();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LogisticsController();