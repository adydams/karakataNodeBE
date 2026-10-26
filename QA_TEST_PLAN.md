# Karakata End-to-End QA Test Plan

## 1. Purpose and scope

This document is the execution checklist for testing Karakata from environment
setup through customer purchase, fulfillment, settlement, payout, return,
refund, administration, and operational recovery.

It covers:

- Backend REST APIs and database effects.
- React customer, store, driver, and admin interfaces.
- Authentication, authorization, validation, and error responses.
- Inventory reservation and release.
- Product and order-item approval workflows.
- Internal logistics and ShipBubble integrations.
- Paystack and Flutterwave payment paths.
- Wallet accounting, settlement review, payouts, and reversals.
- Notifications, scheduled jobs, audit records, and observability.
- Browser compatibility, accessibility, performance, and security.

The tester must verify both the response shown to the user and the persistent
state in the database. A green HTTP response is not sufficient if the related
inventory, order, shipment, wallet, ledger, notification, or audit record is
incorrect.

## 2. Test environments

### 2.1 Required services

- Node.js version supported by the repository.
- MySQL database with all base migrations and
  `node migrate_approval_system.js` applied.
- Backend API running on the configured port, normally `5000`.
- Frontend Vite application running on the configured port, normally `5173`.
- A test email provider or captured-mail inbox.
- Paystack test credentials and webhook signing secret.
- Flutterwave test credentials and webhook signing secret.
- ShipBubble sandbox credentials, a scheduled shipment, and a delivered
  shipment where possible.
- Cloudinary test credentials if image upload is in scope.

### 2.2 Startup and migration checks

1. Start the API without a database connection and confirm the process fails
   visibly rather than reporting a false healthy state.
2. Start the API with valid database credentials and confirm all route groups
   mount.
3. Open `/api-docs` and confirm the Swagger page loads.
4. Run:

   ```bash
   node migrate_approval_system.js
   ```

5. Run the migration a second time. It must be idempotent and must not create
   duplicate columns or tables.
6. Confirm these columns/tables exist:
   - `system_settings` approval and escalation settings.
   - `products` approval fields.
   - `orderitems` approval fields.
   - `return_requests.returnRateRequestToken`.
   - `refund_logs`.
   - `missed_approval_logs`.
7. Confirm the migration exits with a non-zero status and useful log when the
   database is unavailable.
8. Confirm secrets are supplied through environment variables and are not
   returned in API responses or logs.

### 2.3 Test personas

Create isolated accounts for:

| Persona | Expected access |
|---|---|
| Customer | Browse, cart, checkout, pay, track, request return, review |
| Store owner / StoreAdmin | Manage own catalog, approve own order items, manage own returns, view own finance |
| Admin | Operational administration permitted by configured role |
| SystemAdmin | System settings and permitted administration |
| SuperAdmin | Full administration, product approval, finance, permissions |
| Driver / Captain | Assigned delivery tasks and allowed shipment status updates |
| Suspended user | Authentication may succeed or be denied according to policy, but protected actions must be blocked |
| Unauthenticated visitor | Public catalog only; protected routes return `401` |

Use at least two stores, two stations, two products, two customers, one
multi-store order, one pickup order, and one shipped order.

### 2.4 Baseline test data

Prepare:

- Product with stock at one station.
- Product with stock split across two stations.
- Product with zero stock.
- Product assigned to a different category and subcategory.
- Product with images, no images, discount, tiered discount, invalid discount,
  and a deleted product.
- Customer with valid and invalid addresses, including coordinates.
- Store with payout account details and a store without payout details.
- Wallets with zero, pending, available, and insufficient balances.
- Orders in unpaid, paid, processing, shipped, delivered, cancelled, and
  partially fulfilled states.
- A payment reference that succeeds, fails, is already verified, and is
  unknown.
- A ShipBubble scheduled shipment and a delivered shipment.
- Return requests that are pending, approved, rejected, completed, and past
  the seven-day return-rate window.

## 3. Test execution rules

For each test:

1. Record actor, environment, request payload, timestamp, and IDs.
2. Capture the HTTP status and complete response body, excluding secrets.
3. Check the browser result and API result.
4. Query affected tables before and after the action.
5. Confirm no unrelated records changed.
6. Repeat important writes to test idempotency and duplicate protection.
7. Test at least one invalid input and one dependency failure for each
   critical workflow.

Use a clean database or uniquely tagged data for each test case. Do not run
destructive truncation against a shared environment.

## 4. Release smoke test

Run this after every deployment:

1. Register or log in.
2. Load the public product list and product details.
3. Add an in-stock product to cart.
4. Request a shipping rate.
5. Complete checkout using a payment sandbox.
6. Verify payment and open the invoice.
7. Confirm the order and shipment appear in the relevant dashboards.
8. Confirm the customer can see tracking.
9. Confirm the store wallet receives a pending sale credit.
10. Confirm an admin can open finance and audit pages.
11. Confirm an unauthorized role receives `403` for an admin endpoint.
12. Confirm a missing route returns the documented error shape rather than an
    HTML server error.

## 5. Authentication, account, and authorization

### 5.1 Registration and login

- Register with valid name, email, phone, and password.
- Reject missing required fields.
- Reject malformed email and invalid phone values.
- Reject duplicate email and duplicate unique identifiers.
- Verify password hashing; plaintext passwords must never be stored or
  returned.
- Login with correct credentials and verify the token/session response.
- Reject wrong password, unknown email, empty credentials, and malformed JSON.
- Verify token expiry, malformed token, wrong signing secret, and revoked or
  inactive account behavior.
- Verify `/api/auth/me` returns only the authenticated user's data.
- Verify logout invalidates or clears the client authentication state.
- Update profile with valid and invalid values.
- Verify profile updates cannot change role, wallet, or ownership fields.

### 5.2 Password reset and OAuth

- Request password reset for an existing account.
- Request reset for an unknown account without leaking whether the email
  exists.
- Complete reset with a valid token.
- Reject expired, reused, tampered, empty, and wrong-user tokens.
- Verify the old password no longer works after reset.
- Start Google OAuth and verify redirect.
- Return from OAuth without `code`, with an invalid code, and with provider
  failure; verify a controlled error.
- Verify OAuth cannot create an account with a conflicting verified email
  without the defined merge policy.

### 5.3 Role and permission matrix

For every protected route, execute the request as customer, StoreAdmin,
Admin, SystemAdmin, SuperAdmin, driver, and unauthenticated user.

Verify:

- Missing token produces `401`.
- Valid token with insufficient role produces `403`.
- StoreAdmin cannot read or modify another store's products, orders, wallets,
  returns, or shipments.
- Driver cannot access finance, settings, product approval, or other drivers'
  assignments.
- Customer cannot invoke admin, store, driver, settlement, payout, or
  approval actions.
- SuperAdmin can access actions explicitly reserved for that role.
- Permissions shown in the admin UI match server enforcement; hiding a menu
  item must not be the only protection.

  ### 5.4 Social Authentication (OAuth)
  
  - **Google Happy Path**: Start Google OAuth $\to$ Authenticate $\to$ Redirect to `/auth/callback` $\to$ Verify JWT is issued and user is logged in.
  - **New User via OAuth**: Sign in with a Google account not in the DB $\to$ Verify user is created with default 'Customer' role and `provider = 'google'`.
  - **Existing User Linking**: Sign in with Google using an email that already exists as a local account $\to$ Verify `provider` and `providerId` are updated on the existing user record without creating a duplicate.
  - **Provider Failure**: Simulate OAuth failure (e.g., user cancels login or provider returns error) $\to$ Verify redirect to `/login?error=oauth_failed`.
  - **Graceful Degradation**: Attempt to use Facebook, X, or Instagram when credentials are missing in `.env` $\to$ Verify API returns `503 Service Unavailable` with a "disabled" message instead of crashing.
  - **Frontend Integration**: Verify `SocialLogin` component renders buttons for all providers and correctly redirects to `/api/auth/[provider]`.
  
  ## 6. Catalog, categories, and product approval

### 6.1 Categories, subcategories, and brands

- Create, list, read, update, and delete categories.
- Create a subcategory linked to a category.
- Reject a subcategory with a missing category.
- Change category and confirm the subcategory relationship and product forms
  update correctly.
- Prevent deletion or report the effect when products still reference a
  category, subcategory, or brand.
- Verify pagination, search, duplicate names, case handling, and empty lists.

### 6.2 Product creation and update

- Create a valid product with multipart fields and images.
- Create with no images, one image, five images, and more than five images.
- Validate name, price, stock, weight, dimensions, category, subcategory,
  store, and pickup station.
- Reject negative price, negative dimensions, invalid stock, malformed IDs,
  oversized files, unsupported file types, and empty required fields.
- Confirm a subcategory must belong to the selected category.
- Confirm stock is created at the requested station and product/station links
  are correct.
- Update only one field using multipart form data.
- Update with empty strings and confirm the intended existing-value behavior.
- Update stock and verify `quantityOnHand` changes without corrupting
  `quantityReserved`.
- Update images and verify old images are retained or replaced according to
  the product contract.
- Soft-delete a product and confirm it is excluded from public queries.
- Verify deleted products cannot be added to new carts.

### 6.3 Approval toggle and state machine

Test both settings:

- `productApprovalRequired = false`: newly created product is `approved` and
  appears publicly.
- `productApprovalRequired = true`: newly created product is
  `pending_review`, has the configured deadline, is absent from public lists
  and details, and generates the intended notifications.

Review transitions:

- Pending product can be approved by an authorized reviewer.
- Pending product can be rejected with a required reason.
- Approval records reviewer and review timestamp.
- Rejection stores the reason and notifies the store owner.
- Rejected product cannot appear publicly.
- Rejected or approved product cannot be approved/rejected again unless the
  API explicitly supports that transition.
- Customer, StoreAdmin from another store, and unauthorized admins cannot
  decide approval.
- Product approval list supports pagination and empty state.
- Product SLA job identifies overdue products and sends notifications.
- Confirm whether the SLA is notification-only; verify it does not silently
  auto-approve or auto-reject when automatic action is disabled.

## 7. Cart and pricing

- Create or retrieve the authenticated user's cart.
- Add a valid product and quantity one.
- Add the same product again and verify the defined merge behavior.
- Reject zero, negative, fractional, string, and excessive quantities.
- Reject deleted, unapproved, unavailable, or unauthorized products.
- Update quantity within stock and beyond stock.
- Remove one item and clear the cart.
- Verify cart totals after every change.
- Verify product price is read from the server, not trusted from the client.
- Test fixed, percentage, and tiered discounts:
  - quantity below minimum;
  - quantity within each tier;
  - quantity above an open-ended maximum;
  - overlapping tiers;
  - invalid min/max range;
  - percentage below zero or above the allowed maximum;
  - fixed value greater than item subtotal;
  - expired and inactive discounts.
- Verify rounding, currency precision, and zero/negative final totals.

## 8. Checkout and payment

### 8.1 Checkout preparation

- Checkout with an empty cart.
- Checkout with a valid pickup address and a valid shipping address.
- Reject an address belonging to another user.
- Reject missing email, phone, gateway, address, shipping method, courier, or
  request token when required.
- Verify `shippingMethod = PICKUP` does not require a shipping rate token.
- Verify `shippingMethod = SHIPPING` requires a current `requestToken`.
- Send a client-supplied `shippingFee` that differs from the verified rate;
  confirm it is ignored or rejected and cannot alter the total.
- Use an expired, unknown, reused, or courier-mismatched request token.
- Change cart contents after rates were fetched and before checkout; verify
  the rate is revalidated.
- Change product price after rates were fetched; verify server-side pricing.

### 8.2 Sourcing and reservation

- Single-store, single-station order.
- Single-store order sourced from multiple stations.
- Multi-store order.
- Product available at only one station.
- Insufficient total stock.
- Concurrent checkouts for the last unit.
- Verify reservation occurs before order creation and cannot oversell.
- On any checkout failure, verify all reservations are released and no
  orphan order, payment, or fulfillment rows remain.
- Verify each `OrderItem` and fulfillment record references the correct store,
  product, station, quantity, and price snapshot.

### 8.3 Totals and shipping

- Product subtotal, discount, fetch rate, shipping fee, markup, and final
  total must add up exactly.
- Verify commission is calculated on product subtotal according to settings,
  not on shipping unless the business rule explicitly says otherwise.
- Test internal shipping using base fee, distance, weight, and configured
  markup.
- Test Haversine distance with same coordinates, nearby coordinates, and
  invalid coordinates.
- Test pickup with zero shipping and no unintended fetch fee.
- Test external courier quotes and the cheapest/fastest selections.
- Verify shipping snapshot is stored with the order and remains auditable.

### 8.4 Payment initialization and verification

- Initialize Paystack and Flutterwave payments.
- Verify response contains the order/payment reference and payment URL when
  the gateway succeeds.
- Simulate gateway timeout, rejected credentials, malformed gateway response,
  and duplicate initialization.
- Verify an unpaid order is not treated as paid and wallet credits are absent.
- Verify successful payment verification is idempotent.
- Verify repeated webhook or verification does not duplicate wallet credits,
  shipment creation, notifications, or inventory commitment.
- Verify a failed or reversed payment releases inventory according to the
  order lifecycle.
- Verify webhook signature/header validation and invalid webhook rejection.
- Verify payment amount, currency, reference, and order ownership are checked
  server-side.

## 9. Order approval workflow

- Create an order with one item and verify the item starts `pending` with an
  approval deadline based on `orderItemApprovalWindowHours`.
- Create a multi-store order and verify each store sees only its own items.
- Verify each store owner receives an app notification and email.
- Approve an item before the deadline and verify:
  - `approvalStatus = approved`;
  - response timestamp is set;
  - the item remains in fulfillment;
  - shipment cancellation lock applies.
- Decline an item and verify:
  - `approvalStatus = declined`;
  - reason is stored where supported;
  - reserved inventory is released;
  - item is removed/soft-deleted according to the order model;
  - order totals and shipping snapshot are recalculated;
  - customer refund is initiated;
  - wallet credit is reversed or skipped according to when it was created.
- Run expiry processing after the deadline and verify the same effects as an
  unapproved item.
- Run expiry before the deadline and verify no item changes.
- Process the same item twice and verify no duplicate release, refund,
  reversal, notification, or missed-approval log.
- Verify a single missed approval does not automatically delist a product.
- Verify missed approval logs include item, product, store, and timestamp.
- Test escalation threshold and rolling window settings.
- Test auto-unlisting enabled and disabled.

## 10. Logistics and shipment lifecycle

### 10.1 Rates and address validation

- Request rates with valid sender, receiver, package weight, dimensions, and
  items.
- Verify the request token is returned and tied to the quote.
- Verify courier list, cheapest courier, fastest courier, totals, VAT,
  discount, ETA, and service code are displayed consistently.
- Test invalid address, missing coordinates, missing package data, provider
  timeout, provider `400`, and malformed provider response.
- Verify fallback address lookup behavior where configured.
- Verify a rate from one customer/order cannot be reused by another order.

### 10.2 Shipment creation

- Create a shipment only after the required payment/order state.
- Verify ShipBubble receives the selected courier, service code, request token,
  package, sender, receiver, and amount.
- Verify local shipment stores provider order ID, tracking URL, status, and
  shipment events.
- Retry shipment creation after a provider timeout; confirm no duplicate local
  shipment or duplicate provider order.
- Verify missing provider reference is surfaced as an actionable error.

### 10.3 Shipment event synchronization

- Apply every supported event in chronological order:
  `ORDER_RECEIVED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, and failure or
  cancellation states where supported.
- Verify duplicate webhook/event delivery is idempotent.
- Verify out-of-order events do not move a shipment backward unless explicitly
  supported.
- Verify tracking timeline shows timestamp, location, note, and status.
- Verify customer, store, driver, and admin views show consistent status.

### 10.4 Shipment cancellation

- Cancel a scheduled shipment that has no approved order item.
- Confirm the API calls:

  ```text
  POST /v1/shipping/labels/cancel/:order_id
  ```

- Change local status to cancelled only after ShipBubble returns
  `status: "success"`.
- Simulate provider `400`, timeout, network error, and non-success body;
  confirm local status remains unchanged and the failure is visible.
- Attempt cancellation after the processing date; verify provider/business
  rule response.
- Attempt cancellation when any relevant order item is approved; verify the
  approval lock blocks the provider call.
- Cancel an already cancelled shipment and verify duplicate protection.
- Attempt cancellation with no provider order ID.

## 11. Driver and delivery operations

- Driver sees only assigned shipments.
- Unassigned driver cannot update a shipment.
- Driver can perform only valid status transitions.
- Driver cannot mark another driver's shipment delivered.
- Verify pickup, in-transit, delivered, failed, and cancellation actions
  create events and timestamps.
- Verify delivery completion triggers any configured return-window start.
- Test offline/slow submission and duplicate button clicks.
- Verify dashboard counts and workload indicators update after status changes.

## 12. Customer orders, invoice, tracking, and notifications

- Customer sees only their orders.
- Store users cannot read another customer's private address or invoice.
- Invoice contains item prices, quantities, discounts, shipping, fetch fees,
  totals, payment status, and shipment details.
- Verify invoice totals match the order and payment records.
- Verify PDF invoice generation, filename, content type, and large-order
  behavior.
- Verify order list filters, pagination, empty state, and loading/error state.
- Verify tracking refresh and provider updates.
- Verify notification creation, unread count, read action, and deletion or
  retention policy.
- Verify email and in-app notification failures are logged without corrupting
  the financial/order transaction.

## 13. Returns and ShipBubble return shipping

### 13.1 Customer return request

- Request a return for an eligible delivered order item.
- Reject a return for an item not owned by the customer.
- Reject duplicate return requests for the same item where policy prohibits
  them.
- Validate required reason, fault party, quantities, and attachments if
  enabled.
- Verify the return window is calculated from the configured policy and the
  correct payment/delivery timestamp.
- Reject a request after the return window.
- Verify the initial status is `PENDING` and the correct order/store/product
  links are saved.

### 13.2 Approval and rejection

- StoreAdmin approves only returns belonging to that store.
- SuperAdmin can approve according to policy.
- Customer and unrelated StoreAdmin receive `403`.
- Approve within the return window and verify:
  - status changes once;
  - refund amount is correct;
  - return shipping fault is applied correctly;
  - original payment method is selected;
  - wallet sale earning is reversed exactly once;
  - reversal targets pending balance when the sale is pending;
  - reversal targets available balance when already settled;
  - append-only `REFUND_REVERSAL` ledger entry is created.
- Reject with a reason and verify no refund, wallet reversal, or restock.
- Reject without a reason if a reason is required.
- Approve/reject a non-pending return and verify invalid transition handling.

### 13.3 ShipBubble return rates

- Use an approved return request linked to a delivered ShipBubble shipment.
- Request rates through:

  ```text
  POST /api/returns/:id/shipping-rates
  ```

- Verify the adapter calls:

  ```text
  POST /v1/shipping/returns/:order_id/fetch_rates
  ```

- Verify `pickup_date` is required and must use `yyyy-mm-dd`.
- Test optional `delivery_instructions`, `sender_phone`, and
  `reciever_phone`.
- Verify the ShipBubble `request_token` is returned and stored in
  `returnRateRequestToken`.
- Reject a pending, rejected, or completed return.
- Reject a shipment that is not delivered.
- Reject a request more than seven days after the latest delivery event or
  configured delivery timestamp.
- Test provider `400`, timeout, empty courier list, and malformed response.
- Verify provider failure does not mark the return shipped or completed.

### 13.4 Refund processing

- Initiate Paystack refund for an expired/declined approval item and an
  approved product return.
- Verify `RefundLog` stores item, amount, provider refund ID, reason, and
  initial status.
- Verify asynchronous refund statuses:
  `initiated -> processing -> completed`.
- Process refund failure and verify `failed`, failure reason, retry count,
  and last attempt timestamp.
- Deliver duplicate `refund.processed` and `refund.failed` webhooks.
- Verify webhook cannot update an unrelated refund.
- Run retry job and verify retry limit, admin notification, and no infinite
  retry loop.
- Verify customer-facing status distinguishes initiated/processing from
  completed; a successful initiation must not be presented as money already
  received.

### 13.5 Restock

- Confirm restock only for an approved return.
- Reject restock for pending, rejected, or already completed return.
- Verify quantity returns to the original pickup station.
- Verify `quantityReserved` is not incorrectly changed.
- Verify status becomes `COMPLETED` only after the inventory update succeeds.
- Simulate inventory/database failure and verify return remains recoverable
  and no false completion is shown.

## 14. Finance, settlement, and payout

### 14.1 Wallet credit

- On successful paid order, verify one `SALE_CREDIT` per eligible store/item.
- Verify commission, net amount, order ID, item ID, store ID, and settlement
  date.
- Verify the store's `pendingBalance` increases by the net store earning.
- Verify shipping is not included in commission when that is the configured
  rule.
- Verify payment verification repeated does not duplicate credits.

### 14.2 Settlement review

- `GET /api/admin/finance/settlement-eligible` shows only transactions with
  `status = PENDING` and `settlesAt <= now`.
- Future transactions remain pending.
- Verify result grouping by wallet/store and settleable amount/count.
- Confirm settlement for selected wallet IDs.
- Confirm settlement for all wallets when no filter is supplied, if supported.
- Verify each transaction changes to `SETTLED`.
- Verify pending decreases, available increases, and lifetime earnings
  changes exactly once.
- Verify selecting an empty list, unknown wallet, or non-wallet ID produces a
  controlled response.
- Simulate transaction failure and verify all wallet and ledger changes roll
  back together.
- Run settlement concurrently and verify no double settlement.

### 14.3 Payouts

- Verify minimum payout amount is enforced.
- Verify a wallet with insufficient available balance cannot be paid out.
- Verify missing bank account, bank code, or account name is rejected.
- Verify payout creates the expected `Payout` state and `PAYOUT_DEBIT`
  ledger entry.
- Verify available balance is deducted atomically.
- Verify Paystack transfer success, failure, timeout, and duplicate callback.
- Verify payout retry/reconciliation does not debit twice.
- Verify pending balance cannot be used for payout.
- Verify store owner sees only their payouts; admins see authorized aggregate
  views.
- Verify payout status transitions and timestamps.

### 14.4 Financial integrity

For each wallet, independently calculate:

```text
availableBalance + pendingBalance
= all valid credits - all valid debits
```

Check after sale credit, settlement, payout, return reversal, declined item,
failed payout, and retry. Any mismatch is a release-blocking defect.

Verify financial records are append-only. Corrections must create reversal or
adjustment entries rather than editing historical transaction amounts.

## 15. Admin settings, permissions, and audit

- Read and update commission rate, shipping markup, return window, payout
  delay, minimum payout, product approval, product SLA, order approval
  window, missed-approval threshold/window, and auto-unlisting settings.
- Validate numeric ranges, percentages, hours, days, booleans, and missing
  values.
- Verify only authorized roles can update each setting.
- Confirm setting changes affect new operations without corrupting existing
  orders or transactions.
- Verify settings UI loads current server values and handles save failures.
- Create, list, filter, paginate, and deactivate admin users.
- Assign and revoke permissions.
- Confirm deactivated admins cannot perform protected actions.
- Confirm admin actions create audit entries containing actor, action,
  resource, timestamp, and outcome where implemented.
- Verify audit list filtering, pagination, read-only behavior, and access
  control.
- Attempt to edit/delete audit records and confirm the API does not permit it.
- Verify finance, product approval, returns, shipment, settings, and user
  pages have correct loading, empty, error, and unauthorized states.

## 16. Frontend and usability testing

- Test every route in `src/App.tsx` directly and through navigation.
- Refresh every protected route and verify authentication restoration or safe
  redirect.
- Test sidebar collapse on mobile widths and desktop widths.
- Confirm navigation closes after a mobile link selection.
- Verify active navigation state and permission-based visibility.
- Test forms with keyboard only: tab order, focus, submit, cancel, and modal
  close.
- Verify labels, validation messages, toast messages, and field-level errors
  identify the actual missing/invalid field.
- Test slow network, API `400`, `401`, `403`, `404`, `409`, `422`, `500`, and
  timeout responses in every major page.
- Prevent double-submit on checkout, payment verification, approvals,
  payouts, returns, and shipment actions.
- Verify buttons show progress and recover after failure.
- Test responsive layouts at 320px, 375px, 768px, 1024px, and wide desktop.
- Test Chrome, Edge, Firefox, and Safari-compatible behavior where supported.
- Check images, broken image fallback, long names, long addresses, empty
  tables, large numbers, and date/time formatting.
- Check color contrast, visible focus, screen-reader labels, and error
  announcements.

## 17. API, data, and security testing

- Validate `Content-Type`, JSON parsing, multipart upload, and request-size
  limits.
- Verify XSS payloads are sanitized or rejected in names, notes, reasons,
  addresses, descriptions, and support fields.
- Test SQL injection strings in search, filter, sort, IDs, and free text.
- Test path traversal and malicious upload filenames.
- Verify CORS allows configured origins and rejects unauthorized origins as
  required by deployment policy.
- Verify Helmet/security headers.
- Verify sensitive data is absent from errors, logs, invoices, and responses.
- Verify rate limiting or operational protection for login, password reset,
  checkout, webhooks, and expensive list endpoints if configured.
- Verify object-level authorization with guessed UUIDs.
- Verify webhook signature validation and replay handling.
- Verify database foreign keys, unique constraints, nullability, enum values,
  decimal precision, and timestamp timezone behavior.
- Test transactions under deadlock, connection loss, and rollback.
- Test concurrent cart updates, reservations, approvals, settlement, payout,
  and refund processing.

## 18. Scheduled jobs and recovery

Run each scheduled job directly in a controlled environment or wait for its
configured schedule:

- Order-item approval expiry.
- Product approval SLA notification.
- Failed refund retry.
- Missed-approval escalation and optional auto-unlisting.
- Settlement of matured wallet transactions.
- Scheduled payouts.
- Shipment/event synchronization where configured.

For every job:

- Run with zero eligible records.
- Run with one eligible record.
- Run with many records and pagination/batching.
- Run twice and verify idempotency.
- Inject one bad record and verify remaining records are handled safely.
- Inject provider/database failure and verify retry or alert behavior.
- Verify logs identify job name, record ID, count, duration, and failure.
- Verify no job silently marks work complete after an external failure.

## 19. Observability and operational checks

- API logs include method, route, status, duration, and correlation context
  where configured.
- Slow requests are visible.
- Provider request failures include provider, operation, and safe error
  details, but not credentials or payment secrets.
- Database errors are actionable and do not expose SQL or credentials.
- Notifications/email failures are visible to operations.
- Health/startup behavior is distinguishable from database migration status.
- Confirm production error monitoring receives uncaught errors.
- Confirm backups and restore procedures can recover orders, wallets,
  payments, refunds, and audit records.

## 20. Performance and resilience

Measure at minimum:

- Public product list response time with realistic catalog size.
- Search/filter and pagination at high record counts.
- Checkout with one item, multi-store items, and multi-station sourcing.
- Concurrent reservation attempts for one last unit.
- Settlement and payout with a large wallet/transaction set.
- Return-rate calls under provider latency.
- Admin finance and audit tables with large histories.

Load tests must verify:

- No overselling.
- No duplicate payment/wallet/shipment/refund records.
- No negative wallet balances.
- No request hangs without timeout or visible failure.
- Recovery after provider and database interruptions.

## 21. End-to-end business scenarios

### Scenario A: Successful shipped order

Register customer -> add approved product -> add address -> request rates ->
checkout -> initialize payment -> complete Paystack sandbox payment -> verify
payment -> reserve/commit inventory -> approve item -> create shipment ->
receive events -> deliver -> settlement window matures -> settle wallet ->
initiate payout -> reconcile ledger.

Expected result: one financially balanced order, one shipment timeline, one
sale credit, one settlement, and one payout debit with no duplicate records.

### Scenario B: Multi-store order

Add products from two stores -> obtain one shipping quote -> checkout -> verify
payment -> confirm separate order-item fulfillments -> each store approves or
declines its own item -> recalculate order and shipping -> fulfill remaining
items -> verify per-store wallet entries and customer invoice.

### Scenario C: Missed store approval

Create paid order -> leave one item pending -> advance clock past deadline ->
run expiry job -> verify item expiry, stock release, total recalculation,
Paystack refund initiation, refund log, wallet reversal/skip, notification,
and missed-approval log -> run job again and verify no duplicate effects.

### Scenario D: Customer return

Deliver order -> create return -> approve -> fetch ShipBubble return rates ->
select courier/continue return operations -> receive item -> confirm restock ->
verify completed return, Paystack refund lifecycle, wallet reversal, inventory
increase, and audit trail.

### Scenario E: Shipment cancellation failure

Create scheduled shipment for an unapproved item -> request cancellation ->
make ShipBubble return `400` or timeout -> verify local shipment is unchanged
and an actionable retry/manual-operations error is shown. Repeat with an
approved item and verify the provider is never called.

## 22. Defect severity and release gates

### Severity

- **Blocker:** data loss, security bypass, double charge, double payout,
  negative/incorrect wallet, overselling, or production startup failure.
- **Critical:** checkout/payment/return/shipment lifecycle unusable, refund
  cannot be tracked, or unauthorized financial/admin action succeeds.
- **Major:** core workflow partially fails with a workaround, incorrect
  inventory/notification/status, or important page unusable.
- **Minor:** non-critical UI, formatting, copy, or recoverable edge case.

### Release gates

Do not release when:

- Any blocker or critical defect is open.
- Checkout can create duplicate orders, payments, reservations, or wallet
  credits.
- A provider failure changes local shipment/payment/refund state falsely.
- A role can access another user's/store's financial or personal data.
- Wallet reconciliation does not balance.
- Required migrations fail or are not idempotent.
- Approval expiry, return, or payout can silently lose money or inventory.

Release requires:

- Smoke suite passed.
- Critical end-to-end scenarios passed.
- Authorization matrix passed.
- Migration verified on a production-like database backup.
- Provider sandbox tests passed or a documented operational waiver exists.
- Test evidence and known limitations attached to the release.

## 23. Evidence checklist

Attach to every test cycle:

- Build and commit identifier.
- Environment and configuration summary without secrets.
- Migration output.
- API request/response captures.
- Browser screenshots or recordings for failed UI cases.
- Database before/after IDs and relevant row snapshots.
- Payment, ShipBubble, email, webhook, and job logs.
- Performance results and concurrency parameters.
- Defect IDs, severity, reproduction steps, and affected data.
- Final pass/fail matrix and release approval.

## 24. Current implementation watch-list

These items must be confirmed during QA rather than assumed from UI labels or
older documentation:

- The actual mounted route prefixes must be tested; legacy test files may use
  paths that differ from the current `/api/...` mounts.
- Manual payout and balance-adjustment behavior must be verified against the
  current controller implementation before being treated as production-ready.
- Return shipping fee calculation must be verified against the live logistics
  integration rather than a fallback or placeholder value.
- ShipBubble cancellation is currently treated as synchronous success/failure;
  monitor production responses for any asynchronous behavior.
- Product SLA currently notifies overdue approvals; verify whether automatic
  approval/rejection is intentionally disabled.
- Confirm the exact point at which sale commission is written so expired
  order-item refund tests assert reversal versus skipped credit correctly.
- Run the frontend build and lint separately from backend Jest tests; failures
  in unrelated legacy files must not be confused with a passing critical-flow
  test.

## 25. Existing validation commands

Backend:

```bash
npm test
node migrate_approval_system.js
```

Frontend:

```bash
npm run build
npm run lint
```

Run commands from the corresponding repository directory and record the exact
output. Do not treat a command that exits early because of missing environment
variables, database access, or provider credentials as a passed test.




🛡️ QA Test Plan: Payment & Fulfillment Orchestration

1. The "Happy Path" (End-to-End Success)

Goal: Verify that a standard payment flow triggers all subsequent actions correctly.

┌──────────────┬────────────────────────┬─────────────────────┬──────────────────────────────┐
│  Test Case   │         Action         │   Expected Result   │      Verification Point      │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│              │ Complete a checkout    │                     │                              │
│ Order        │ $\to$ Pay via Gateway  │ Order status        │ Orders table: status =       │
│ Completion   │ $\to$ Redirect to      │ becomes PAID.       │ 'PAID'                       │
│              │ /verify/:orderId       │                     │                              │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│ Inventory    │ Trigger verify()       │ Reserved stock is   │ Inventory table:             │
│ Commitment   │                        │ formally deducted.  │ quantityOnHand decreased     │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│              │                        │ Store owners        │                              │
│ Wallet       │ Trigger verify()       │ receive their net   │ WalletTransaction table:     │
│ Credit       │                        │ earnings in         │ type = 'SALE_CREDIT' created │
│              │                        │ pendingBalance.     │                              │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│ Logistics    │                        │ A shipment record   │ Shipments table created;     │
│ Trigger      │ Trigger verify()       │ is created with an  │ ShipmentEvent has            │
│              │                        │ initial event.      │ ORDER_RECEIVED               │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│ Customer     │                        │ Customer receives   │ Notifications table: type =  │
│ Notification │ Trigger verify()       │ "Payment received"  │ 'ORDER_PAID'                 │
│              │                        │ notification.       │                              │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│              │                        │ All involved store  │                              │
│ Store        │ Trigger verify()       │ owners receive      │ Notifications table: type =  │
│ Notification │                        │ "Order Paid!"       │ 'STORE_PAYMENT_CONFIRMED'    │
│              │                        │ notification.       │                              │
├──────────────┼────────────────────────┼─────────────────────┼──────────────────────────────┤
│ Invoice      │                        │ Customer receives   │ Email inbox: Invoice PDF     │
│ Delivery     │ Trigger verify()       │ the PDF invoice     │ attached                     │
│              │                        │ email.              │                              │
└──────────────┴────────────────────────┴─────────────────────┴──────────────────────────────┘

---

2. Idempotency & Guard Rails (The "Stress Test")

Goal: Ensure that multiple triggers of the verification process do not result in duplicate financial or logistics records.

Test Case: Double-Verification (Finance)
Action: Call /api/orders/verify/:id twice in rapid succession.
Expected Result: Second call should NOT create new wallet credits or deduct inventory again.
Verification Point: WalletTransaction: Only ONE SALE_CREDIT per order.
────────────────────────────────────────
Test Case: Double-Verification (Logistics)
Action: Call /api/orders/verify/:id twice.
Expected Result: Second call should NOT create a second Shipment record.
Verification Point: Shipments table: Only ONE record per orderId.
────────────────────────────────────────
Test Case: Webhook + Redirect Race
Action: Simulate a Webhook hit and a Browser Redirect hitting /verify at the same millisecond.
Expected Result: The first one wins; the second one is ignored by guards.
Verification Point: DB integrity: No duplicate credits/shipments.
────────────────────────────────────────
Test Case: Manual Admin Sync
Action: Admin clicks "Verify Payment" in Finance Dashboard after a webhook already processed it.
Expected Result: Admin sees "Success", but no duplicate financial movements occur.
Verification Point: WalletTransaction: No duplicate credits.

---

3. Edge Cases & Error Handling

Goal: Verify system stability when things go wrong.

Test Case: Partial Fulfillment Failure
Action: Trigger verify() where one store's wallet is locked/deleted.
Expected Result: Transaction rolls back; inventory is not partially deducted.
Verification Point: DB: No partial credits; Order stays PENDING or logs error.
────────────────────────────────────────
Test Case: Logistics API Timeout
Action: Trigger verify() for an external shipment where ShipBubble API is down.
Expected Result: Order remains PAID (customer is not penalized), but logisticsStatus is
DELIVERY_FAILED.
Verification Point: Orders table: logisticsStatus = 'DELIVERY_FAILED'
────────────────────────────────────────
Test Case: Missing Store Owner
Action: Product is linked to a store with no ownerUserId.
Expected Result: System handles the null gracefully; payment still completes.
Verification Point: Logs: No "Cannot read property of null" crash.
────────────────────────────────────────
Test Case: Invalid Payment Ref
Action: Call /verify with a reference that doesn't exist at the gateway.
Expected Result: Order status becomes FAILED.
Verification Point: Orders table: status = 'FAILED'

---

4. Financial & Data Integrity Audit

Goal: Mathematical verification of the ledger.

┌────────────────┬──────────────────────────────────────────┬─────────────────────────────────┐
│ Verification   │                  Logic                   │        Success Criteria         │
│     Point      │                                          │                                 │
├────────────────┼──────────────────────────────────────────┼─────────────────────────────────┤
│ Wallet         │ $\sum (\text{SALE_CREDIT}) - \sum        │ Result must exactly equal       │
│ Summation      │ (\text{PAYOUT_DEBIT})$                   │ availableBalance +              │
│                │                                          │ pendingBalance.                 │
├────────────────┼──────────────────────────────────────────┼─────────────────────────────────┤
│ Inventory      │ $\text{Initial Stock} - \sum             │ Result must match current       │
│ Audit          │ (\text{Committed Quantities})$           │ quantityOnHand.                 │
├────────────────┼──────────────────────────────────────────┼─────────────────────────────────┤
│ Order Balance  │ $\text{Gross Amount} = \text{Net Amount} │ All order totals must balance   │
│                │  + \text{Commission} + \text{VAT}$       │ across the platform.            │
└────────────────┴──────────────────────────────────────────┴─────────────────────────────────┘

---

🚀 Execution Guide for Tester

1. Setup: Use a test account and a mock payment gateway reference.
2. Step 1: Perform a standard checkout.
3. Step 2: Trigger the /verify endpoint via Postman.
4. Step 3: Immediately trigger the same endpoint again to test guards.
5. Step 4: Check the WalletTransaction and Shipment tables to ensure only one record exists.
6. Step 5: Check the Notifications table for the store owner alert.
7. Step 6: Verify the email inbox for the PDF invoice.





🏷️ QA Test Plan: Discount & Promotion Engine

1. Product-Level (Tiered) Discounts

Goal: Verify that discounts scale correctly based on the quantity of a specific item.

Test Case: Tier 1 (Low Qty)
Action: Add 1-4 units of a product with a 5% tier.
Expected Result: Price is reduced by 5% for that specific item.
Verification Point: Checkout: Item subtotal is correct.
────────────────────────────────────────
Test Case: Tier 2 (Mid Qty)
Action: Add 5-19 units of a product with a 10% tier.
Expected Result: Price is reduced by 10% for that specific item.
Verification Point: Checkout: Item subtotal is correct.
────────────────────────────────────────
Test Case: Tier 3 (High Qty)
Action: Add 20+ units of a product with a $\text{₦}200$ flat tier.
Expected Result: A flat $\text{₦}200$ is deducted from the unit
price.
Verification Point: Checkout: Item subtotal is correct.
────────────────────────────────────────
Test Case: Mixed Cart
Action: Add 2 units of Product A (Tier 1) and 25 units of Product B
(Tier 3).
Expected Result: Product A gets % discount; Product B gets flat
discount.
Verification Point: Invoice: Separate discounts applied per line
item.

---

2. Global Discounts: Manual Codes (Coupons)

Goal: Verify that coupon codes are validated and applied to the grand total.

Test Case: Valid Percentage
Action: Apply a "10% OFF" code.
Expected Result: Grand total is reduced by 10%.
Verification Point: Checkout: discountAmount reflects 10%.
────────────────────────────────────────
Test Case: Valid Fixed Amount
Action: Apply a "$\text{₦}1,000$ OFF" code.
Expected Result: Grand total is reduced by exactly $\text{₦}1,000$.
Verification Point: Checkout: discountAmount is $\text{₦}1,000$.
────────────────────────────────────────
Test Case: Expired Code
Action: Apply a code where expiryDate < now.
Expected Result: Error: "This discount code has expired."
Verification Point: UI: Toast notification; no discount applied.
────────────────────────────────────────
Test Case: Usage Limit
Action: Apply a code that has reached its maxUsage.
Expected Result: Error: "This code has reached its maximum usage
limit."
Verification Point: UI: Toast notification; no discount applied.
────────────────────────────────────────
Test Case: Invalid Code
Action: Apply a non-existent code (e.g., "FAKE123").
Expected Result: Error: "Invalid discount code."
Verification Point: UI: Toast notification; no discount applied.

---

3. Global Discounts: Automatic Promos

Goal: Verify that "ongoing" discounts are applied without user input.

Test Case: Automatic Trigger
Action: Checkout with a cart total that meets the "Auto-Promo"
threshold.
Expected Result: Discount is applied automatically upon entering
checkout.
Verification Point: Checkout: "Automatic Promo Applied" label
visible.
────────────────────────────────────────
Test Case: Threshold Not Met
Action: Checkout with a total below the Auto-Promo minimum.
Expected Result: No automatic discount is applied.
Verification Point: Checkout: discountAmount is 0.
────────────────────────────────────────
Test Case: Active Status
Action: Toggle an Auto-Promo to isActive: false in admin.
Expected Result: The discount immediately stops applying to new
checkouts.
Verification Point: Checkout: No discount applied.

---

4. "The Best Deal" Logic (Arbitration)

Goal: Verify that the system always chooses the most beneficial discount for the customer when multiple are available.

Test Case: Manual > Auto
Action: Auto-Promo gives $\text{₦}500$; Manual Code gives
$\text{₦}1,000$.
Expected Result: System applies the Manual Code ($\text{₦}1,000$).
Verification Point: Checkout: discountId matches the Manual Code.
────────────────────────────────────────
Test Case: Auto > Manual
Action: Auto-Promo gives $\text{₦}2,000$; Manual Code gives
$\text{₦}500$.
Expected Result: System applies the Auto-Promo ($\text{₦}2,000$).
Verification Point: Checkout: discountId matches the Auto Promo.
────────────────────────────────────────
Test Case: Tie-Break
Action: Both give $\text{₦}1,000$.
Expected Result: System applies one (usually Auto) consistently.
Verification Point: Checkout: Total is reduced by $\text{₦}1,000$.

---

5. Persistence & Data Integrity

Goal: Ensure the discount is actually saved and doesn't "disappear" after payment.

Test Case: Order Save
Action: Complete a checkout with a discount.
Expected Result: discountId and discountAmount are written to the
Orders table.
Verification Point: DB: Orders table $\to$ discountAmount $\neq 0$.
────────────────────────────────────────
Test Case: Usage Increment
Action: Complete a checkout using a Manual Code.
Expected Result: The code's usageCount increases by 1.
Verification Point: DB: Discounts table $\to$ usageCount
incremented.
────────────────────────────────────────
Test Case: Invoice Accuracy
Action: View the PDF Invoice after payment.
Expected Result: The invoice correctly lists the discount applied.
Verification Point: PDF: "Discount: $-\text{₦}X,XXX$" is visible.

---

6. Frontend UX (Real-time Preview)

Goal: Verify the user sees the price change instantly.

Test Case: Live Update
Action: Type a valid code into the coupon field.
Expected Result: Total updates immediately without page refresh.
Verification Point: UI: Price changes in real-time.
────────────────────────────────────────
Test Case: Code Removal
Action: Remove the coupon code.
Expected Result: Total reverts to the original price (or Auto-Promo
price).
Verification Point: UI: Price updates immediately.
────────────────────────────────────────
Test Case: Quantity Shift
Action: Change quantity from 4 $\to$ 5 (crossing a Tier threshold).
Expected Result: The product-level discount updates immediately.
Verification Point: UI: Subtotal for that item decreases.

---

🚀 Testing Strategy for QA

1. Step 1 (Product Layer): Add 20 units of a product. Verify the Tiered Discount is applied.
2. Step 2 (Global Layer): Add a Manual Code that is better than the auto-promo. Verify it overrides the auto-promo.
3. Step 3 (Execution): Complete the payment.
4. Step 4 (Audit): Check the Orders table to ensure the discountAmount was persisted and the Discounts table usageCount was increased.
5. Step 5 (Document): Open the Invoice PDF and verify the math: $\text{Subtotal} - \text{Discount} + \text{Shipping} + \text{VAT} = \text{Grand Total}$.
