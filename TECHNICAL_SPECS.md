# 🛠 Technical Specification: Settlement Review & Return Product Systems

## 1. Overview
These two systems manage the critical transition of funds from a "reserved" state to "payable" state, and the reversal of those funds in the event of a product return.

- **Settlement Review**: A safeguard that prevents the immediate payout of funds. It ensures that a "Return Window" expires before a store can access their earnings, protecting the platform from paying out funds for items that are subsequently returned.
- **Return Product System**: A full-lifecycle management system for handling product returns, from the customer's initial request to the financial reversal in the vendor's wallet and the final physical restocking of inventory.

Together, they form the "Financial Guardrail" of the Karakata platform.

---

## 2. Architecture & Call Flow

### 2.1 Settlement Review Architecture
**Modules Involved**: `AdminFinanceController` $\to$ `WalletService` $\to$ `Wallet` / `WalletTransaction` Models.

**Call Flow**:
1. **Identification**: `AdminFinanceController.getSettlementEligible`
   - Queries `Wallet` for all wallets where `pendingBalance > 0`.
   - For each wallet, queries `WalletTransaction` for records where `status === 'PENDING'` AND `settlesAt <= now`.
   - Returns a list of stores and their respective "settleable" amounts.
2. **Execution**: `AdminFinanceController.confirmSettlement` $\to$ `WalletService.settleMaturedTransactions(walletIds)`
   - Initiates a database transaction.
   - Finds all matured `WalletTransaction` records (filtered by `walletIds` if provided).
   - Updates transaction status to `SETTLED`.
   - Moves funds: `Wallet.pendingBalance` $\downarrow$ and `Wallet.availableBalance` $\uparrow$.
   - Updates `Wallet.lifetimeEarnings` $\uparrow$.

### 2.2 Return Product Architecture
**Modules Involved**: `ReturnController` $\to$ `ReturnService` $\to$ `WalletService` / `PaymentService` / `InventoryService`.

**Call Flow**:
1. **Request**: `ReturnController.create` $\to$ `ReturnService.create`
   - Validates `OrderItem` exists.
   - Locates the original `SALE_CREDIT` transaction for that item.
   - Creates a `ReturnRequest` record with status `PENDING`.
2. **Approval**: `ReturnController.approve` $\to$ `ReturnService.approve`
   - **Validation**: Checks if `now < (order.paidAt + returnWindowDays)`.
   - **Financial Reversal**: Calls `WalletService.reverseEarning(walletTransactionId)`.
   - **Payment Refund**: Calls `PaymentService.createRefund` to return money to the customer.
   - **Update**: Sets `ReturnRequest.status` to `APPROVED`.
3. **Closing**: `ReturnController.confirmRestock` $\to$ `ReturnService.confirmRestock`
   - Calls `InventoryService.restock()` to increment product quantity at the specific `pickupStationId`.
   - Sets `ReturnRequest.status` to `COMPLETED`.

---

## 3. Data Models

### 3.1 Wallet (Model: `Wallet`)
| Field | Type | Purpose |
| :--- | :--- | :--- |
| `availableBalance` | DECIMAL(10,2) | Funds that have passed the return window and are ready for payout. |
| `pendingBalance` | DECIMAL(10,2) | Funds from recent sales awaiting the return window expiry. |
| `lifetimeEarnings` | DECIMAL(10,2) | Total net amount ever settled for the store. |

### 3.2 Wallet Transaction (Model: `WalletTransaction`)
| Field | Type | Purpose |
| :--- | :--- | :--- |
| `type` | ENUM | `SALE_CREDIT` (Income), `PAYOUT_DEBIT` (Payout), `REFUND_REVERSAL` (Return). |
| `status` | ENUM | `PENDING` (Awaiting window), `SETTLED` (Moved to available), `COMPLETED`. |
| `netAmount` | DECIMAL(10,2) | The actual value moving (positive for credit, negative for debit). |
| `settlesAt` | DATE | The exact timestamp when the funds move from Pending $\to$ Available. |

### 3.3 Return Request (Model: `ReturnRequest`)
| Field | Type | Purpose |
| :--- | :--- | :--- |
| `orderItemId` | UUID | Link to the specific product being returned. |
| `walletTransactionId`| UUID | Link to the original `SALE_CREDIT` transaction to be reversed. |
| `status` | ENUM | `PENDING` $\to$ `APPROVED` / `REJECTED` $\to$ `COMPLETED`. |
| `faultParty` | ENUM | `CUSTOMER` or `STORE` (Determines who pays return shipping). |
| `refundAmount` | DECIMAL(10,2) | The amount returned to the customer. |
| `returnShippingFee` | DECIMAL(10,2) | Cost of moving the item back to the store. |

---

## 4. Business Logic & State Machines

### 4.1 Settlement Logic
**Conditional Branches**:
- **Maturity Check**: `settlesAt <= new Date()` $\to$ True: Eligible for settlement; False: Remains `PENDING`.
- **Filtering**: If `walletIds` are passed to `settleMaturedTransactions`, only those specific wallets are processed; otherwise, all matured transactions in the system are settled.

### 4.2 Return Logic State Machine
**Transitions**:
- `PENDING` $\to$ `APPROVED`: Triggered by Admin. Requires return window validation. Triggers `reverseEarning` and `PaymentService.createRefund`.
- `PENDING` $\to$ `REJECTED`: Triggered by Admin. Requires a `reason` string. No financial movement.
- `APPROVED` $\to$ `COMPLETED`: Triggered by Admin confirming physical receipt. Triggers `InventoryService.restock`.

### 4.3 Reversal Logic (`WalletService.reverseEarning`)
**Branching Logic for Balance Deduction**:
1. **Check `WalletTransaction.status`**:
   - If `PENDING`: Deduct `netAmount` from `Wallet.pendingBalance`.
   - If `SETTLED`: Deduct `netAmount` from `Wallet.availableBalance`.
2. **Audit Trail**: Always creates a new `WalletTransaction` of type `REFUND_REVERSAL` with a negative `netAmount` to ensure the ledger balances.

---

## 5. External Dependencies & Failure Modes

| Dependency | Call | Failure Impact | Handling |
| :--- | :--- | :--- | :--- |
| **Database (Postgres)** | All Queries | System Halt | Wrapped in `try-catch` with 500 error responses. |
| **Paystack API** | `PaymentService.createRefund` | Refund not sent to customer | Transaction is rolled back via `t.rollback()` if the refund fails during approval. |
| **Payment Gateway** | `SALE_CREDIT` | Store not credited | Order is not marked as PAID until wallet credit succeeds. |

---

## 6. Error Handling

- **Return Window Expiry**: In `ReturnService.approve`, if `now >= expiryDate`, it throws `new Error("Return window has expired")`, which is caught by the controller and returned as a 400 Bad Request.
- **Insufficient Funds**: In `reverseEarning`, if the deduction would result in a negative balance (though rare for returns), the transaction is rolled back.
- **Missing Transaction**: If `ReturnService.create` cannot find a `SALE_CREDIT` transaction for the item, it throws `"No payment transaction found for this item"`.

---

## 7. Entry Points

### Settlement Endpoints
- **GET** `/api/admin/finance/settlement-eligible`
  - **Response**: `{ success: true, data: [{ walletId, storeName, settleableAmount, transactionCount }] }`
- **POST** `/api/admin/finance/confirm-settlement`
  - **Request**: `{ walletIds: string[] }`
  - **Response**: `{ success: true, message: "Successfully settled X matured transactions." }`

### Return Endpoints
- **POST** `/api/returns/request`
  - **Request**: `{ orderItemId, reason }`
  - **Response**: `{ success: true, data: ReturnRequest }`
- **PATCH** `/api/returns/:id/approve`
  - **Request**: `{ faultParty: "STORE" | "CUSTOMER" }`
  - **Response**: `{ success: true, data: ReturnRequest }`
- **PATCH** `/api/returns/:id/confirm-restock`
  - **Response**: `{ success: true, message: "Restock confirmed, return completed" }`

---

## 8. Known Issues & TODOs
- **Manual Payout Implementation**: `AdminFinanceController.triggerPayout` currently returns `501 Not Implemented`.
- **Return Shipping Quotes**: `ReturnService.approve` uses a mock value of `500` for return shipping fees instead of calling a real logistics API.
- **Manual Balance Adjustments**: `AdminFinanceController.adjustBalance` is currently `501 Not Implemented`.

---

## 📂 Files Read for this Documentation
- `controllers/adminFinanceController.js`
- `controllers/returnController.js`
- `services/walletServices.js`
- `services/returnServices.js`
- `services/inventoryServices.js`
- `routes/adminRoutes.js`
- `routes/returnRoutes.js`
- `models/walletModel.js`
- `models/walletTransactionModel.js`
- `models/returnRequestModel.js`
- `models/storeModel.js`
- `models/systemSettingModel.js`
- `models/orderModel.js`
- `models/orderItemModel.js`
