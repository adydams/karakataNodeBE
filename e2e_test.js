const { Order, OrderItem, Wallet, WalletTransaction, Shipment, ShipmentEvent, User, Store, Product, Role } = require('./models');
const OrderServices = require('./services/orderServices');
const WalletService = require('./services/walletServices');
const auditService = require('./services/auditService');
const PaymentService = require('./services/paymentServices');
const sequelize = require('./db/database');

// Mock Payment Service to avoid actual API calls in tests
PaymentService.verifyPayment = async () => true;
PaymentService.createTransfer = async () => ({
  code: 'MOCK_TRANSFER_CODE',
  reference: 'MOCK_TRANSFER_REF'
});

async function runTest() {
  try {
    console.log("🚀 Starting End-to-End Logistics & Finance Verification...");

    const roles = await Role.findAll();
    const getRoleId = (name) => roles.find(r => r.name === name)?.id;
    const customerRoleId = getRoleId('Customer');
    const driverRoleId = getRoleId('Driver');
    const adminRoleId = getRoleId('SuperAdmin');

    if (!customerRoleId || !driverRoleId || !adminRoleId) {
      throw new Error(`Required roles not found. Available: ${roles.map(r => r.name).join(', ')}`);
    }

    const customer = await User.findOne({ where: { roleId: customerRoleId } });
    const driver = await User.findOne({ where: { roleId: driverRoleId } });
    const admin = await User.findOne({ where: { roleId: adminRoleId } });

    if (!customer || !driver || !admin) {
      throw new Error("Required test users for each role not found in database.");
    }

    console.log(`Users found: Customer(${customer.name}), Driver(${driver.name}), Admin(${admin.name})`);

    const product = await Product.findOne();
    if (!product) throw new Error("No products found in DB.");
    
    const store = await Store.findByPk(product.storeId);
    if (store) {
      await store.update({
        payoutAccountNumber: '1234567890',
        payoutBankCode: '057',
        payoutAccountName: store.name
      });
      console.log(`Updated bank details for store: ${store.name}`);
    }

    const order = await Order.create({
      userId: customer.id,
      totalAmount: 5000,
      shippingFee: 1000,
      status: 'PENDING',
      shippingMethod: 'SHIPPING',
      shippingProvider: 'internal',
      shippingSnapshot: {
        courier: { id: 'internal', name: 'Karakata Internal' }
      }
    });

    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      price: 4000,
      subtotal: 4000
    });

    const verifiedResult = await OrderServices.verify(order.id);
    console.log("✅ Order verified as PAID");

    const wallet = await Wallet.findOne({ where: { storeId: product.storeId } });
    console.log(`Store Wallet Pending Balance: ${wallet.pendingBalance}`);

    const shipment = await Shipment.findOne({ where: { orderId: order.id } });
    if (!shipment) throw new Error("Shipment not created");
    
    await shipment.update({ driverId: driver.id });
    console.log(`Driver ${driver.name} assigned to shipment`);

    const events = [
      { status: 'PICKED_UP', location: 'Store Hub', note: 'Picked up by driver' },
      { status: 'IN_TRANSIT', location: 'On the road', note: 'Package is moving' },
      { status: 'DELIVERED', location: 'Customer Doorstep', note: 'Delivered successfully' },
    ];

    for (const event of events) {
      await ShipmentEvent.create({
        shipmentId: shipment.id,
        status: event.status,
        location: event.location,
        note: event.note
      });
      console.log(`Event created: ${event.status} at ${event.location}`);
    }

    const settledCount = await WalletService.settleMaturedTransactions([wallet.id]);
    console.log(`Settled ${settledCount} transactions`);
    
    const updatedWallet = await Wallet.findByPk(wallet.id);
    console.log(`Available Balance: ${updatedWallet.availableBalance}`);

    const payoutResult = await WalletService.processManualPayout({
      walletId: wallet.id,
      amount: updatedWallet.availableBalance * 0.5,
      adminUserId: admin.id
    });
    console.log(`Payout initiated. Payout ID: ${payoutResult.payoutId}`);

    const logs = await require('./models').AuditLog.findAll({
      where: { entityId: wallet.id },
      order: [['createdAt', 'DESC']]
    });
    console.log(`Found ${logs.length} audit logs for this wallet`);

    console.log("\n✨ End-to-End Verification Completed Successfully!");
  } catch (err) {
    console.error("\n❌ Test Failed:");
    console.error(err);
    process.exit(1);
  }
}

runTest();
