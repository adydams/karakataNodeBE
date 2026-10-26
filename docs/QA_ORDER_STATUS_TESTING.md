# Order Status and Shipment QA Guide

This guide validates the order, payment, shipment, tracking, and return lifecycle
after the order-data reset.

## Test prerequisites

- Use a test customer account.
- Confirm the backend and frontend are running.
- Confirm the test customer has at least one shippable product available.
- Confirm the selected shipping address and payment test configuration are valid.
- Refresh the My Orders page after each state transition to avoid stale cached data.

For every test, inspect the API response and record these fields:

```text
order.status
order.logisticsStatus
order.shipments[0].status
order.shipments[0].events
order.items[].status
```

## Status source of truth

Use the following order of authority:

1. `order.status` controls payment and order outcome.
2. `shipment.status` controls the current shipment state.
3. `order.logisticsStatus` mirrors the shipment lifecycle for reporting.
4. `shipment.events` is historical tracking information only.

The latest event must not override the current `shipment.status`.

## Expected status mapping

| Shipment status | Order logistics status | My Orders tab | Customer label |
|---|---|---|---|
| `pending` | `PROCESSING` | Active | Order received |
| `processing` | `PROCESSING` | Active | Processing |
| `accepted` | `PROCESSING` | Active | Processing |
| `assigned` | `PROCESSING` | Active | Processing |
| `order_received` | `PROCESSING` | Active | Order received |
| `picked_up` | `IN_TRANSIT` | Active | Picked up |
| `shipped` | `SHIPPED` | Active | Shipped |
| `in_transit` | `IN_TRANSIT` | Active | In transit |
| `out_for_delivery` | `IN_TRANSIT` | Active | Out for delivery |
| `delivered` | `DELIVERED` | Delivered | Delivered |
| `returned` | `PROCESSING` | Returns flow | Return in progress |
| `failed` | `DELIVERY_FAILED` | Cancelled/failure flow | Payment failed or delivery issue |
| `cancelled` | `DELIVERY_FAILED` | Cancelled | Delivery cancelled |

## Test 1: Successful order creation

### Steps

1. Add a product to the cart.
2. Select shipping.
3. Complete payment successfully.
4. Open My Orders.
5. Open Track Order.

### Expected API state

```text
order.status = PAID
order.logisticsStatus = PROCESSING
shipment.status = pending
shipment.events includes ORDER_RECEIVED
```

### Expected UI

- My Orders tab: Active
- Status label: Order received
- Tracking modal current status: pending/order received
- Tracking timeline includes ORDER_RECEIVED
- Order is not in Delivered
- Order is not eligible for return

## Test 2: Driver assignment

### Steps

1. From the admin or driver page, assign the shipment to a driver.
2. Refresh My Orders.
3. Open the tracking modal.

### Expected API state

```text
order.status = PAID
shipment.status = assigned
order.logisticsStatus = PROCESSING
```

### Expected UI

- Order remains in Active.
- Order does not appear in Delivered.
- Tracking timeline contains the assignment event.

## Test 3: Shipment progress

Run each status as a separate test:

```text
accepted
picked_up
shipped
in_transit
out_for_delivery
```

### Expected results

- The order remains in Active.
- The visible label matches the current shipment status.
- `shipment.status` changes to the requested normalized value.
- `order.logisticsStatus` is synchronized.
- A tracking event is appended.
- The tracking modal current status comes from `shipment.status`.

For example:

```text
shipment.status = in_transit
order.logisticsStatus = IN_TRANSIT
My Orders tab = Active
label = In transit
```

## Test 4: Internal shipment delivery

### Steps

1. Use an internal shipment.
2. Progress it to an eligible delivery state.
3. Use the internal shipment action to mark it delivered.
4. Refresh My Orders.
5. Open the tracking modal.

### Expected API state

```text
order.status = PAID
shipment.status = delivered
order.logisticsStatus = DELIVERED
shipment.events includes DELIVERED
```

### Expected UI

- My Orders tab: Delivered
- Status label: Delivered
- Tracking modal current status: Delivered
- Timeline displays the delivery history
- Delivered items can be eligible for return within the configured return window

## Test 5: Failed payment

### Steps

1. Start checkout.
2. Force or simulate a failed payment.
3. Open My Orders.

### Expected API state

```text
order.status = FAILED
```

The order must not be treated as a valid shipping order.

### Expected UI

The order must not appear in:

- Active
- Delivered

If failed orders are retained in the order history, they should appear in the
failure/cancelled flow with a payment-failed message. They must not display a
delivery tracking state.

## Test 6: Cancelled order

### Steps

1. Create an eligible order.
2. Cancel it before delivery.
3. Refresh My Orders.

### Expected API state

```text
order.status = CANCELLED
shipment.status = cancelled
order.logisticsStatus = DELIVERY_FAILED
```

### Expected UI

- Tab: Cancelled
- Label: Delivery cancelled
- Not shown in Active
- Not shown in Delivered
- No return action

## Test 7: Returned item from a delivered order

### Steps

1. Complete and deliver an order containing one or more items.
2. Initiate a return for one item.
3. Complete the return workflow.
4. Refresh both Delivered and Returns & Refunds tabs.

### Expected item behavior

```text
returned item status = RETURNED
```

- The returned item appears in Returns & Refunds.
- In the Delivered tab, the returned item is not shown as a normal delivered item.
- If other items remain delivered, the order can remain in Delivered with only
  the delivered items visible.
- If every item is returned, the parent order must not remain in Delivered.

## Test 8: Conflicting event history

This verifies that event ordering cannot change the current state.

### Test data

Use an order with:

```text
shipment.status = pending
shipment.events includes DELIVERED
order.status = PAID
```

### Expected behavior

- The current shipment state remains pending.
- My Orders shows Active / Order received.
- Tracking modal current status shows pending.
- The timeline may still display the historical DELIVERED event.
- The event list must not promote the order to Delivered.

If the event is confirmed to represent a real delivery, run the historical
repair script and then verify:

```powershell
node scripts\repair_order_statuses.js --apply --orderId=ORDER_ID
```

After repair:

```text
shipment.status = delivered
order.logisticsStatus = DELIVERED
```

## Test 9: Empty Active tab

An empty Active tab is valid if there are no orders currently in active shipment
states.

Confirm the API has no orders with these shipment states:

```text
pending
processing
accepted
assigned
order_received
picked_up
shipped
in_transit
out_for_delivery
```

If active orders exist in the API but the tab is empty, record:

- order ID
- `order.status`
- `order.logisticsStatus`
- `shipment.status`
- current URL/query tab
- screenshot of the My Orders page

## Regression checklist

- [ ] A paid order starts in Active.
- [ ] A pending shipment displays Order received.
- [ ] Driver assignment does not move an order to Delivered.
- [ ] In-transit states remain in Active.
- [ ] Internal delivery moves the order to Delivered.
- [ ] Tracking modal uses `shipment.status` for Current Status.
- [ ] Tracking events remain visible as history.
- [ ] Failed payments do not appear as active shipments.
- [ ] Cancelled orders do not appear as active or delivered.
- [ ] Returned items appear in Returns & Refunds.
- [ ] Fully returned orders do not remain in Delivered.
- [ ] Conflicting event timestamps do not change the current status.
- [ ] `order.logisticsStatus` remains synchronized with shipment state.

## Useful commands

Preview historical status conflicts without changing data:

```powershell
node scripts\repair_order_statuses.js
```

Apply historical status repairs after reviewing the dry-run output:

```powershell
node scripts\repair_order_statuses.js --apply
```

Clear order test data only. This preserves users, products, stores, inventory,
addresses, settings, and payouts:

```powershell
node scripts\clear_order_data.js
node scripts\clear_order_data.js --apply
```
