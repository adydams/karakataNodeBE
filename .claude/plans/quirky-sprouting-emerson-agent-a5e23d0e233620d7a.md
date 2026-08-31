# Implementation Plan: Invoice Fixes & Multi-Source Order Tracking

## 1. Requirements Overview

### 1.1 Fix Invoice User Info
- **Current State**: `OrderServices.getInvoice` uses hardcoded "Customer", "N/A" (email), and "N/A" (phone).
- **Goal**: Retrieve real user email from `User` model and phone from `Order` model.

### 1.2 Shipping Fee Discrepancy
- **Current State**: `getShippingQuote` (frontend) calculates `courier fee + markup`. `checkout` (backend) adds `fetch rates` from `SourcingService.allocateStock`.
- **Goal**: The invoice already shows the final stored `shippingFee`. To avoid confusion, provide a breakdown of courier fee vs. sourcing/fetch fee.

### 1.3 Multi-Source Order Tracking
- **Architecture**: Implement a Strategy pattern for shipping providers.
  - `ShippingProvider` interface.
  - `ShipBubbleProvider` implementation.
  - `ShippingManager` to route requests.
- **Endpoint**: New `GET /api/orders/:orderId/track`.
- **Invoice Integration**: Include tracking URL and status in `getInvoice` response.
- **Database**: Update `Shipment` model to support multiple providers.

### 1.4 ShipBubbles Tracking API
- **Goal**: Create a configurable `ShipBubbleProvider` for tracking requests.

---

## 2. Detailed Design

### 2.1 Database Changes (`models\shipmentModel.js`)
- Rename `shipbubbleOrderId` to `providerOrderId` to be provider-agnostic.
- Add `provider` column (STRING) to store the provider key (e.g., `'SHIPBUBBLE'`).

### 2.2 Shipping Tracking Architecture (Strategy Pattern)
- **`services\shipping\ShippingProvider.js`**:
  - Abstract base class or interface.
  - Method: `async trackShipment(shipmentId, providerOrderId): Promise<{ status: string, trackingUrl: string }>`
- **`services\shipping\ShipBubbleProvider.js`**:
  - Extends `ShippingProvider`.
  - Implements `trackShipment` using ShipBubbles API.
- **`services\shipping\ShippingManager.js`**:
  - Maintains a registry of `ShippingProvider` implementations.
  - Method: `async getTrackingInfo(orderId): Promise<{ status: string, trackingUrl: string }>`
    - Fetches the `Shipment` record for the order.
    - Identifies the provider.
    - Delegates to the appropriate `ShippingProvider`.

### 2.3 Invoice & Order Service Enhancements (`services\orderServices.js`)
- **`getInvoice(orderId, userId)`**:
  - Update `Order.findByPk` query to `include: [{ model: User, as: 'user' }]`.
  - Update response mapping:
    - `fullName`: `order.user.name` or `order.user.fullName`.
    - `email`: `order.user.email`.
    - `phone`: `order.phone`.
  - Update `shippingFee` to include a `breakdown` object:
    - `total`: `order.shippingFee`
    - `courierFee`: `order.shippingSnapshot?.courier?.totalFee || 0`
    - `sourcingFee`: `order.shippingFee - (order.shippingSnapshot?.courier?.totalFee || 0)`
  - Integrate `ShippingManager.getTrackingInfo(orderId)` to add `tracking: { status, url }` to the invoice.

### 2.4 API Layer (`routes\orderRoutes.js` & `controllers\orderController.js`)
- Add `GET /:orderId/track` route.
- Implement `orderController.track`:
  - Validate user authorization.
  - Call `ShippingManager.getTrackingInfo(orderId)`.
  - Return tracking status and URL.

---

## 3. Implementation Steps

### Step 1: Model Updates
- [ ] Modify `models\shipmentModel.js` to add `provider` and rename `shipbubbleOrderId`.
- [ ] Update any existing references to `shipbubbleOrderId` in the codebase to `providerOrderId`.

### Step 2: Strategy Pattern Implementation
- [ ] Create `services\shipping\ShippingProvider.js`.
- [ ] Create `services\shipping\ShipBubbleProvider.js` (configurable via `.env`).
- [ ] Create `services\shipping\ShippingManager.js`.

### Step 3: Order Services Update
- [ ] Modify `services\orderServices.js` $\rightarrow$ `getInvoice`:
  - Add `User` include.
  - Fix user info (email, phone, name).
  - Add shipping fee breakdown.
  - Add tracking info integration.

### Step 4: API Endpoint Implementation
- [ ] Add route to `routes\orderRoutes.js`.
- [ ] Implement handler in `controllers\orderController.js`.

### Step 5: Verification
- [ ] Test `/api/orders/:orderId/invoice` for correct user data and shipping breakdown.
- [ ] Test `/api/orders/:orderId/track` for correct tracking status.
- [ ] Verify that the invoice now includes tracking information.

---

## 4. Critical Files

- `models\shipmentModel.js`
- `services\orderServices.js`
- `routes\orderRoutes.js`
- `controllers\orderController.js`
- `services\shipping\ShippingManager.js` (New)
- `services\shipping\ShipBubbleProvider.js` (New)
- `services\shipping\ShippingProvider.js` (New)
EOF`
