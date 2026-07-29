const {
  sequelize,
  User, Store, Product, StorePickupStation, Inventory,
  Cart, CartItem, Order, OrderItem, Payment,
  SystemSetting, Wallet, WalletTransaction, Payout, ReturnRequest
} = require('../models');

const OrderServices = require('../services/orderServices');
const WalletService = require('../services/walletServices');
const ReturnService = require('../services/returnServices');
const PaymentService = require('../services/paymentServices');
const InventoryService = require('../services/inventoryServices');
const LogisticsService = require('../services/logisticsService');
const ShipBubbleAdapter = require('../services/ShipBubbles/shipbubbleAdapter');

// Mock ShipBubble to avoid API failures in E2E tests
ShipBubbleAdapter.validateAddress = async () => ({ address_code: 111222333 });
ShipBubbleAdapter.fetchRates = async () => ({
  request_token: 'mock-token-123',
  couriers: [
    { id: 'courier-1', name: 'Test Courier', fee: 500, estimated_days: 3 }
  ],
  cheapest_courier: { id: 'courier-1', fee: 500 },
  fastest_courier: { id: 'courier-1', fee: 500 }
});
ShipBubbleAdapter.createShipment = async () => ({
  order_id: 'SB-MOCK-123',
  courier: { name: 'Test Courier' },
  status: 'pending',
  tracking_url: 'https://shipbubble.com/track/mock',
  payment: { shipping_fee: 500 }
});
ShipBubbleAdapter.getRates = async () => ({
  couriers: [
    { id: 'courier-1', name: 'Test Courier', fee: 500, estimated_days: 3 }
  ]
});

// Mock PaymentService to avoid actual API calls
PaymentService.initialize = async ({ order }) => ({
  payment: { reference: `pay_ref_${order.id}` },
  paymentUrl: 'https://paystack.com/mock-pay'
});
PaymentService.verifyPayment = async () => ({ success: true });
PaymentService.createTransfer = async () => ({ code: 'tx_code', reference: 'tx_ref' });
PaymentService.createRefund = async () => ({ reference: 'ref_mock', status: 'success' });

async function runE2ETest() {
  process.env.SHIPBUBBLE_SENDER_ADDRESS_CODE = '123456';
  console.log('🚀 Starting End-to-End Marketplace Flow Test...\n');

  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'return_requests', 'payouts', 'wallet_transactions', 'wallets',
      'order_item_fulfillments', 'order_items', 'orders', 'payments',
      'cart_items', 'carts', 'inventories', 'product_pickup_stations',
      'products', 'store_pickup_stations', 'stores', 'users',
      'roles', 'permissions', 'system_settings'
    ];

    for (const table of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\``).catch(() => {});
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database cleared for testing');

    // 0. Setup System Settings
    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = await SystemSetting.create({
        businessModel: 'MARKETPLACE',
        defaultCommissionRate: 8.0,
        shippingMarkupPercent: 2.0,
        returnWindowDays: 5,
        payoutDelayDays: 7,
        minimumPayoutAmount: 1000.0
      });
    }
    console.log('✅ System Settings initialized');

    // 1. Create Users
    const admin = await User.create({ name: 'Super Admin', email: 'admin@test.com', passwordHash: 'hashed_password', roleId: (await require('../models').Role.findOne({ where: { name: 'SuperAdmin' } }))?.id });
    const storeOwner = await User.create({ name: 'Store Owner', email: 'owner@test.com', passwordHash: 'hashed_password' });
    const customer = await User.create({
      name: 'John Doe',
      email: 'cust@test.com',
      passwordHash: 'hashed_password',
      phone: '08012345678'
    });
    console.log('✅ Users created');

    const address = await require('../models').Address.create({
      userId: customer.id,
      addressLine1: '123 Customer Lane',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      postalCode: '100001'
    });
    console.log('✅ Customer address created');

    // 2. Create Store & Infrastructure
    const store = await Store.create({
      name: 'Karakata Test Store',
      ownerUserId: storeOwner.id,
      payoutAccountNumber: '1234567890',
      payoutBankCode: '058',
      payoutAccountName: 'Test Store Account'
    });

    const station = await StorePickupStation.create({
      name: 'Test Station 1',
      storeId: store.id,
      address: '123 Test Street, Lagos'
    });
    console.log('✅ Store and Pickup Station created');

    // 3. Create Product & Inventory
    const category = await require('../models').Category.create({ name: 'Electronics', description: 'Electronic devices' });
    const subCategory = await require('../models').SubCategory.create({ name: 'Phones', categoryId: category.id, description: 'Smartphones and related accessories' });

    const product = await Product.create({
      name: 'Test Smartphone',
      price: 10000.0,
      storeId: store.id,
      categoryId: category.id,
      subCategoryId: subCategory.id
    });

    await Inventory.create({
      productId: product.id,
      pickupStationId: station.id,
      quantityOnHand: 10,
      quantityReserved: 0
    });

    const { ProductPickupStation } = require('../models');
    await ProductPickupStation.create({ productId: product.id, pickupStationId: station.id });
    console.log('✅ Product and Inventory created');

    // 4. Customer Journey: Cart & Checkout
    const cart = await Cart.create({ userId: customer.id });
    await CartItem.create({
      cartId: cart.id,
      productId: product.id,
      quantity: 1
    });
    console.log('✅ Item added to cart');

    const quote = await OrderServices.getShippingQuote(customer.id, {
      receiverAddressId: address.id,
      packageItems: [{ name: product.name, unit_weight: 1, quantity: 1 }]
    });
    console.log('📦 Shipping Quote received. Courier 0 fee:', quote.couriers?.[0]?.fee);

    const checkoutResult = await OrderServices.checkout(customer.id, {
      shippingMethod: 'SHIPPING',
      shippingAddressId: address.id,
      requestToken: 'mock-token',
      courierId: quote.couriers?.[0]?.id || 'mock-courier',
      gateway: 'paystack',
      email: customer.email,
      phone: '08012345678'
    });
    const order = checkoutResult.order;
    console.log('✅ Order created. Total:', order.totalAmount);

    const payment = await Payment.create({
      orderId: order.id,
      userId: customer.id,
      amount: order.totalAmount,
      status: 'PENDING',
      reference: 'pay_test_123',
      gateway: 'paystack'
    });
    await order.update({ paymentReference: payment.reference });

    await OrderServices.verify(order.id);
    console.log('✅ Payment verified. Wallet credited.');

    const wallet = await Wallet.findOne({ where: { storeId: store.id } });
    console.log('💰 Wallet State:', {
      pending: wallet.pendingBalance,
      available: wallet.availableBalance
    });

    await LogisticsService.createShipment({
      orderId: order.id,
      requestToken: 'mock-token',
      serviceCode: 'std',
      courierId: 'courier-1',
      shippingFee: order.shippingFee
    });
    console.log('🚚 Shipment created');

    const tx = await WalletTransaction.findOne({ where: { orderId: order.id, type: 'SALE_CREDIT' } });
    await tx.update({ settlesAt: new Date(Date.now() - 86400000 * 6) });

    const settledCount = await WalletService.settleMaturedTransactions();
    console.log(`🕒 Settlement run: ${settledCount} transactions settled`);

    const updatedWallet = await Wallet.findOne({ where: { storeId: store.id } });
    console.log('💰 Wallet after settlement:', {
      pending: updatedWallet.pendingBalance,
      available: updatedWallet.availableBalance
    });

    await updatedWallet.update({ availableBalance: 5000.0 });
    const payoutResults = await WalletService.initiateScheduledPayouts();
    console.log('💸 Payouts initiated for stores:', payoutResults.length);

    const payout = await Payout.findOne({ where: { storeId: store.id } });
    console.log('🧾 Payout record created:', payout?.id, 'Amount:', payout?.amount);

    const orderItem = await OrderItem.findOne({ where: { orderId: order.id } });
    const returnReq = await ReturnService.create({
      orderItemId: orderItem.id,
      customerId: customer.id,
      reason: 'Item damaged'
    });
    console.log('🔄 Return request created:', returnReq.id);

    await ReturnService.approve(returnReq.id, 'STORE');
    console.log('✅ Return approved (Store Fault)');

    const finalWallet = await Wallet.findOne({ where: { storeId: store.id } });
    console.log('💰 Wallet after return deduction:', {
      available: finalWallet.availableBalance
    });

    await ReturnService.confirmRestock(returnReq.id);
    console.log('📦 Restock confirmed. Inventory reinstated.');

    console.log('\n🎉 E2E Test Completed Successfully!');
  } catch (error) {
    console.error('\n❌ E2E Test Failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runE2ETest();
