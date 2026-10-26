const { Order } = require('./models');
const sequelize = require('./db/database');

async function debug() {
  try {
    const orders = await Order.findAll({
      where: { status: 'PAID' },
      attributes: ['id', 'shippingMethod']
    });
    
    const counts = {};
    orders.forEach(o => {
      const m = o.shippingMethod || 'NULL';
      counts[m] = (counts[m] || 0) + 1;
    });
    
    console.log('Paid Order Shipping Methods:');
    console.log(counts);

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

debug();
