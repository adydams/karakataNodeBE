Implementation Plan: Financial and Return System Completion

## 1. Atomicity in Order Services & Wallet Service
### Problem
 uses a transaction , but calls  which creates its own transaction. This breaks atomicity.

### Solution
- Modify  to .
- In :
    - If  is provided, use it for all operations.
    - If not provided, create a new transaction, commit it, and handle rollbacks.
- In , update the call to .

## 2. Payment Service Enhancements (Paystack Integration)
### Problem
 lacks  and  methods, causing failures in  and .

### Solution
- Implement  in .
    - Call Paystack  API.
    - Convert amount to kobo (multiply by 100).
    - Return the transfer code and reference.
- Implement  in .
    - Fetch the  record for the order to get the Paystack reference.
    - Call Paystack  API using the reference.
    - Convert amount to kobo.
    - Return the refund reference.

## 3. Dynamic Return Shipping Fees
### Problem
 uses a hardcoded .

### Solution
- Integrate  into .
- When , use  to get a real quote for shipping the item from the customer's address back to the store's return address.
- Update the  with the actual fee and the selected courier.

## 4. Inventory Service Verification
### Status
 has been verified. It correctly updates  and syncs the product stock cache. No changes needed.

## Implementation Sequence
1.  **PaymentServices**: Implement  and  first as they are critical dependencies.
2.  **WalletServices**: Modify  for transaction support.
3.  **OrderServices**: Update  to pass the transaction to .
4.  **ReturnServices**: Update  to use dynamic shipping fees and the new .
5.  **Verification**: Run end-to-end tests for payout and return flows.
