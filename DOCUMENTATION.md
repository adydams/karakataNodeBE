# 📘 Karakata Platform: Complete System Specification & Operational Manual

## 1. System Philosophy & Architecture
Karakata is not a simple e-commerce site; it is a **Logistics Orchestration Platform**. Its primary purpose is to decouple the point of sale from the point of fulfillment, allowing a single order to be sourced from multiple distributed pickup stations.

### 🏗 Core Architectural Decisions
- **Multi-Sourcing Engine**: The system allows a single order to contain items from different stores. The `SourcingService` determines the optimal pickup station for each item.
- **The Strategy Pattern (Shipping)**: To support both internal fleets and external partners (like ShipBubble), the system uses a `ShippingManager`. This allows the platform to switch providers without changing the order logic.
- **Financial Atomic Integrity**: All money movements (Credits, Settlements, Payouts) are wrapped in **Sequelize Transactions**. A wallet balance is *never* updated without a corresponding entry in the `WalletTransaction` immutable ledger.
- **Append-Only Ledger**: To ensure auditability, financial records are never edited. If a mistake is made or a return occurs, a **Reversal Transaction** is created to offset the original.

---

## 2. Comprehensive Business Logic

### 💰 2.1 The Global Commission Model
The platform acts as a marketplace intermediary, earning a percentage of every sale.

**The Mathematical Rule**:
Commission is calculated strictly on the **Product Subtotal**. Shipping fees are passed through to the logistics provider and are not subject to commission.

$$\text{Commission Amount} = \text{Subtotal} \times \left( \frac{\text{Global Commission Rate}}{100} \right)$$
$$\text{Net Store Earning} = \text{Subtotal} - \text{Commission Amount}$$

**Workflow**:
1. Admin sets `defaultCommissionRate` in `SystemSetting` (e.g., 8%).
2. On payment verification, the system calculates this amount for every item.
3. The Platform earns the `Commission Amount`; the Store earns the `Net Store Earning`.

### 🚚 2.2 Dynamic Internal Logistics Pricing
To ensure the internal fleet is profitable, Karakata uses a dynamic pricing model based on physical reality.

**The Formula**:
$$\text{Total Shipping Fee} = \text{Base Fee} + (\text{Distance in KM} \times \text{Price per KM}) + (\text{Weight in KG} \times \text{Price per KG})$$

**Variable Breakdown**:
- **Base Fee**: The minimum cost to initiate any delivery.
- **Distance**: Calculated using the **Haversine Formula** between the sourcing station's coordinates and the customer's shipping address coordinates.
- **Weight**: The cumulative `weightKg` of all products in the order.

**The "Fetch Rate" Concept**:
If an item must be moved from a remote pickup station to a central hub before final delivery, a "Fetch Rate" is added to the total cost, which the platform manages internally.

### 🏦 2.3 The Professional Wallet Lifecycle
To protect the platform and vendors from fraud and returns, funds are not immediately available for payout.

**State Transition**: `PENDING` $\to$ `SETTLED` $\to$ `PAID`

1. **The Credit Phase (`SALE_CREDIT`)**:
   - When a customer pays, the store's `pendingBalance` is increased by the `Net Store Earning`.
   - A `WalletTransaction` is created with `status: "PENDING"`.
   - A `settlesAt` date is calculated: $\text{PaidAt} + \text{ReturnWindowDays}$.

2. **The Settlement Phase (`SETTLEMENT`)**:
   - Once `currentTime >= settlesAt`, the funds are "matured."
   - Admin triggers "Settle All" or a cron job runs.
   - **Balance Shift**: `pendingBalance` $\downarrow$ and `availableBalance` $\uparrow$.
   - `lifetimeEarnings` is incremented to track the store's total historical success.

3. **The Payout Phase (`PAYOUT_DEBIT`)**:
   - Once `availableBalance >= minimumPayoutAmount`, funds can be transferred to the store's bank account via Paystack.
   - A `Payout` record is created $\to$ `availableBalance` is deducted $\to$ `WalletTransaction` is logged.

---

## 3. The Customer Experience (UX Flow)

### 🛒 Shopping & Unified Checkout
1. **Discovery**: Customer adds items from various stores to a single cart.
2. **Shipping Selection**: At checkout, the user sees a **Unified Courier List**:
   - **Karakata Internal**: (Dynamic Price) - Recommended for speed/cost.
   - **External Courier**: (API Price) - For long-distance/premium shipping.
   - **Station Pickup**: (Free) - Customer collects from the station.
3. **Payment**: User pays the total sum (Products + Shipping + Fetch Fees).

### 🚚 Tracking & Invoice
Upon successful payment, the user is directed to the `InvoiceTracking` page:
- **Professional Invoice**: A detailed breakdown showing exactly what was paid for products vs. shipping.
- **Skeletal Tracking Timeline**: A vertical timeline of events:
  - `ORDER_RECEIVED` $\to$ `PICKED_UP` $\to$ `IN_TRANSIT` $\to$ `DELIVERED`.
  - Each event shows a timestamp, a location, and a status note.

### 🔄 The Return Process
If a customer needs to return a product:
1. **Request**: They file a return request from the invoice page, specifying the reason and the fault party (`CUSTOMER` or `STORE`).
2. **Verification**: The system checks if the request is within the `returnWindowDays`.
3. **Approval**: If approved by Admin, the funds are reversed from the store's wallet (Pending first, then Available).
4. **Refund**: The money is sent back to the customer's original payment method.

---

## 4. Administrative & Operational Control

### 👑 SuperAdmin (The Control Center)
- **Finance Dashboard**: Monitor "Platform Revenue" (total commissions) and "Platform Liquidity" (total available balances).
- **Settlement Review**: A gated process to verify matured funds before they are settled.
- **Dynamic Settings**: Adjust `Base Fee`, `Price per KM`, `Price per KG`, and `Return Window` in real-time.
- **Fleet Management**: Monitor driver workloads (Idle, Active, Overloaded) and track active shipments.

### 📦 Store Admin (The Vendor)
- **Wallet Tracking**: Monitor `Pending` vs `Available` funds.
- **Return Management**: Review customer return requests, approve/reject them, and confirm when the item is physically restocked into inventory.

### 🏍️ Delivery Driver (The Hands)
- **Task Dashboard**: A mobile-first list of shipments assigned to them.
- **Action-Driven UI**: Buttons to mark a package as `PICKED_UP` or `DELIVERED`, which instantly updates the customer's tracking timeline.

---

## 5. Technical Specifications (The "Under the Hood")

### 🗄 Database Schema Relationships
- **Order** $\to$ **OrderItem** (1:M)
- **OrderItem** $\to$ **WalletTransaction** (1:1 for `SALE_CREDIT`)
- **Shipment** $\to$ **ShipmentEvent** (1:M) - Powers the tracking timeline.
- **ReturnRequest** $\to$ **OrderItem** (1:1) - Links return to a specific product.

### 🛠 Critical API Endpoints
| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/logistics/rates` | GET | Dynamic shipping quote calculation. |
| `/api/admin/finance/settlement-eligible` | GET | Identifies matured funds. |
| `/api/admin/finance/confirm-settlement` | POST | Executes Pending $\to$ Available move. |
| `/api/driver/shipment/:id/status` | PATCH | Driver updates shipment state. |
| `/api/returns/request` | POST | Customer initiates return. |

### 🛡 System Guards & Edge Case Handling
- **The "Broadening" Search**: If a specific street address isn't found, the system strips the house number and retries with city context to ensure the customer can always find their location.
- **Balance Protection**: Wallet deductions (Payouts/Returns) are blocked if `availableBalance` is insufficient, preventing negative balances.
- **Skeletal Sync**: External provider updates (via Webhooks) are converted into internal `ShipmentEvents` so the customer always sees one consistent timeline.
