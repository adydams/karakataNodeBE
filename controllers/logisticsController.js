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

    // ✅ VALIDATION
    if (
      !shippingAddressId ||
      !Array.isArray(packageItems) ||
      packageItems.length === 0 ||
      !packageDimension ||
      !categoryId
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request payload",
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
    const ratesData = await LogisticsService.getShippingRates({
      receiverAddressId: shippingAddressId,
      packageItems,
      packageDimension,
      categoryId,
      pickupDate,
      serviceType,
    });

    return res.status(200).json({
      success: true,
      data: ratesData,
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
   * ShipBubble sends: { order_id: "SB-XXX", status: "shipped" | "in_transit" | "delivered" | "failed" }
   */
  async webhook(req, res) {
    try {
      const { order_id, status } = req.body;

      if (!order_id || !status) {
        return res.status(400).json({ message: "Invalid webhook payload" });
      }

      console.log(`[ShipBubble Webhook] order_id=${order_id} status=${status}`);

      await LogisticsService.updateShipmentStatus(order_id, status);

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err.message);
      // Always return 200 to ShipBubble so it doesn't keep retrying
      return res.status(200).json({ received: true, error: err.message });
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