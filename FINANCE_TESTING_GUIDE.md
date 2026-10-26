# 💰 Finance Ecosystem: Comprehensive Testing & Verification Guide

This document provides a rigorous framework for verifying the financial integrity of the Karakata platform. Since we are dealing with real money (Vendor Wallets, Payouts, and Commissions), these tests must be executed in a staging environment before any production release.

---

## 🎯 Testing Objectives
1. **Accuracy**: Ensure every Naira is accounted for from checkout to payout.
2. **Security**: Verify that only authorized administrators can adjust balances or trigger payouts.
3. **Integrity**: Ensure that the "Global Ledger" is immutable and accurately reflects wallet balances. 
4. **Resilience**: Verify that the system handles insufficient funds and API failures gracefully.

---

## 🚀 Phase 1: The "Happy Path" (End-to-End Flow)
This phase tests the standard lifecycle of money in the system.

| Step | Action | Expected Result | Verification Point |
| :--- | :--- | :--- | :--- |
| **1** | Create Order & Pay | Order is created; Payment status $\to$ `PAID`. | `Orders` table $\to$ `status: 'paid'`. |
| **2** | Verify Credit | Store's `pendingBalance` increases by the net amount. | `Wallets` table $\to$ `pendingBalance`. |
| **3** | Log Transaction | A `SALE_CREDIT` transaction is recorded. | `WalletTransactions` $\to$ `type: 'SALE_CREDIT'`. |
| **4** | Trigger Settlement | Admin triggers "Settle All" or individual "Authorize". | `pendingBalance` $\to$ `availableBalance`. |
| **5** | Manual Payout | Admin triggers a payout to the store's bank account. | `availableBalance` decreases; `Payout` record created. |
| **6** | Audit Trail | The entire sequence is visible in the Global Ledger. | `Global Ledger` $\to$ `SALE_CREDIT` $\to$ `PAYOUT_DEBIT`. |

---

## ⚠️ Phase 2: Edge Cases & Error Scenarios
These tests ensure the system doesn't crash or allow fraud under stress.

### 1. Insufficient Funds
- **Scenario**: Attempt to trigger a manual payout or a `DEBIT` adjustment that exceeds the store's `availableBalance`.
- **Expected Outcome**: 
  - API returns `400 Bad Request`.
  - Response message: `"Insufficient available balance for this operation."`
  - Wallet balance remains unchanged.

### 2. Return & Refund Loop
- **Scenario**: A customer returns an item $\to$ Store approves the return.
- **Expected Outcome**:
  - `WalletService.reverseEarning` is called.
  - Funds are deducted from `pendingBalance` (if available) or `availableBalance`.
  - A `REFUND_REVERSAL` transaction is logged.
  - The platform doesn't pay out funds that were already reversed.

### 3. Unauthorized Access
- **Scenario**: A user with the `StoreAdmin` or `Customer` role attempts to call `/api/admin/finance/wallets/adjust`.
- **Expected Outcome**:
  - API returns `403 Forbidden`.
  - No changes are made to the database.

### 4. Race Conditions
- **Scenario**: Trigger two manual payouts for the same wallet simultaneously.
- **Expected Outcome**:
  - Database transactions (locks) ensure that the second payout only proceeds if funds are still available after the first.
  - No "negative balance" occurs.

---

## 📊 Phase 3: Data Integrity & Mathematical Reconciliation
This is the "Audit" phase to ensure the database is not corrupted.

### The "Summation" Test (The Gold Standard)
For any given store, the following equation **MUST** always be true:
$$\sum (\text{All Credits}) - \sum (\text{All Debits}) = \text{availableBalance} + \text{pendingBalance}$$

**How to test:**
1. Pick a store ID.
2. Run a query to sum all `netAmount` from `WalletTransactions` for that store.
3. Compare the result with the sum of `availableBalance` and `pendingBalance` in the `Wallets` table.
4. **Failure**: Any difference of even 1 Naira indicates a bug in the balance update logic.

---

## ✅ Final Verification Checklist

- [ ] **KPI Accuracy**: Does the "Platform Revenue" stat match the sum of all commissions?
- [ ] **Settlement Logic**: Does "Settle All" only move funds that have passed the `returnWindowDays`?
- [ ] **Payout Integrity**: Does every `PAID` payout have a corresponding `PAYOUT_DEBIT` transaction?
- [ ] **UI Feedback**: Do "Balance Adjustment" and "Manual Payout" modals show success toasts and refresh the table immediately?
- [ ] **Export Validity**: Does the exported CSV report match the data shown in the Global Ledger?
