# Admin Finance Dashboard Finalization Plan

## 1. Overview
The goal is to complete the Admin Finance dashboard by implementing the interactive components for Wallet Details, Balance Adjustment, and Manual Payouts, and providing a comprehensive testing guide.

## 2. UI Design & Implementation

### 2.1 Wallet Details Modal
- **Purpose**: Show a store's full financial state and transaction history.
- **Trigger**: 'View Details' button in the Wallets tab.
- **API**: `apiFinance.getWalletDetails(walletId)`
- **UI Elements**:
    - **Header**: Store Name, Email, and Wallet ID.
    - **Balance Grid**: 3 Stat-style cards:
        - Available Balance (Green)
        - Pending Balance (Amber)
        - Lifetime Earnings (Gray)
    - **Transaction Table**:
        - Columns: Txn ID, Date, Type, Amount, Status.
        - Color Coding: `SALE_CREDIT` (Green), `PAYOUT_DEBIT` (Red), `ADJUSTMENT` (Blue).
- **Implementation**: Create `WalletDetailsModal` component.

### 2.2 Balance Adjustment Modal
- **Purpose**: Allow admins to manually credit or debit a store's available balance.
- **Trigger**: 'Adjust Balance' button in the Wallets tab.
- **API**: `apiFinance.adjustBalance({ walletId, storeId, amount, type, description })`
- **Form Fields**:
    - `Amount`: Number input (required, > 0).
    - `Type`: Select dropdown (`CREDIT` | `DEBIT`).
    - `Description`: Text input (required).
- **Validation**: Client-side validation for positive amount and required fields.
- **Implementation**: Create `BalanceAdjustmentModal` component.

### 2.3 Manual Payout Modal
- **Purpose**: Trigger a manual fund transfer to a store.
- **Trigger**: 'Manual Payout' button in the Payouts tab.
- **API**: `apiFinance.triggerPayout({ storeId, walletId, amount, accountNumber, bankCode, accountName })`
- **Form Fields**:
    - `Store`: Searchable select (fetch stores list if needed, or reuse wallet list).
    - `Amount`: Number input (required, > 0).
    - `Account Number`: Text input (required).
    - `Bank Code`: Text input (required).
    - `Account Name`: Text input (required).
- **Validation**: Ensure available balance $\ge$ payout amount.
- **Implementation**: Create `ManualPayoutModal` component.

## 3. Integration Plan
1.  **Component Architecture**: Implement the modals as separate components to keep `Finance.tsx` clean.
2.  **State Management**: Use `useModal` context (if available/standard in the project) or local state in `Finance.tsx` to control modal visibility and pass the selected `walletId`/`storeId`.
3.  **Button Binding**:
    - Bind 'View Details' $\to$ `openWalletDetails(walletId)`.
    - Bind 'Adjust Balance' $\to$ `openAdjustmentModal(walletId, storeId)`.
    - Bind 'Manual Payout' $\to$ `openPayoutModal()`.
4.  **Query Invalidation**: Use `queryClient.invalidateQueries` after successful payout or adjustment to refresh the Overview, Wallets, and Payouts data.

## 4. Financial System Test Guide

### 4.1 Happy Paths
| Scenario | Steps | Expected Result |
| :--- | :--- | :--- |
| **Order Credit** | Create order $\to$ check wallet | Wallet `pendingBalance` increases; `SALE_CREDIT` txn created. |
| **Manual Payout** | Admin Finance $\to$ Payout $\to$ Enter valid details | `Payout` record 'PROCESSING'; Available balance decreases; `PAYOUT_DEBIT` txn created. |
| **Manual Credit** | Admin Finance $\to$ Adjust $\to$ Type: CREDIT | Available balance increases; `ADJUSTMENT` txn created. |

### 4.2 Edge Cases
| Scenario | Steps | Expected Result |
| :--- | :--- | :--- |
| **Over-Payout** | Payout amount $>$ available balance | Error: "Insufficient available balance for payout". |
| **Over-Debit** | Debit adjustment $>$ available balance | Error: "Insufficient balance for debit adjustment". |
| **Empty Fields** | Submit form with missing required fields | Frontend validation error or 400 "Missing required fields". |
| **Invalid ID** | Call API with non-existent `walletId` | 404 "Wallet not found". |

### 4.3 Audit Trail Verification
- **Action**: Perform any manual financial change (Payout/Adjustment).
- **Check**: Verify `AuditLog` entry exists.
- **Fields to Verify**:
    - `action`: `TRIGGER_PAYOUT` or `BALANCE_CREDIT`/`BALANCE_DEBIT`.
    - `userId`: Matches the Admin's ID.
    - `oldValue` vs `newValue`: Accurate capture of balance change.
    - `entityId`: Matches the affected Wallet ID.

### 4.4 Security & Permissions
- **RBAC**: Verify that only users with `role: 'ADMIN'` can access `/admin/finance/*` endpoints.
- **UI Access**: Verify that the Finance Dashboard is hidden from non-admin users.

## 5. Critical Files for Implementation
- `karakatacommerce/src/pages/adminDashboard/Finance.tsx`
- `karakatacommerce/src/services/adminDashboard/apiFinance.ts`
- `controllers/adminFinanceController.js`
- `services/auditService.js`
EOF`
