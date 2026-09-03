const { Product, OrderItem, User, Order, sequelize } = require("../models");
const { Op } = require("sequelize");

exports.getTopProducts = async (req, res) => {
  try {
    // We want the top 5 products by total quantity sold
    const topProducts = await OrderItem.findAll({
      attributes: [
        "productId",
        [sequelize.fn("SUM", sequelize.col("quantity")), "sales"],
        [sequelize.fn("SUM", sequelize.literal("quantity * price")), "revenue"],
      ],
      group: ["productId"],
      order: [[sequelize.literal("sales"), "DESC"]],
      limit: 5,
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["name", "storeId"],
        },
      ],
    });

    // Map to match the frontend expected format: { id, name, sales, revenue, status }
    const data = await Promise.all(
      topProducts.map(async (item) => {
        const product = item.product;

        // Determine status (simulated or fetched from inventory)
        let status = "In Stock";
        if (item.dataValues.sales < 20) status = "Low Stock";
        if (item.dataValues.sales === 0) status = "Out of Stock";

        return {
          id: product.id,
          name: product.name,
          sales: parseInt(item.dataValues.sales),
          revenue: parseFloat(item.dataValues.revenue),
          status: status,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error fetching top products:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCustomerStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 1. Total Customers
    const totalCustomers = await User.count({
      where: {
        "$role.name$": "Customer"
      },
      include: [{ model: require("../models").Role, as: "role" }]
    });

    // 2. New Customers (last 30 days)
    const newCustomers = await User.count({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo },
        "$role.name$": "Customer"
      },
      include: [{ model: require("../models").Role, as: "role" }]
    });

    // 3. Retargeted Customers (more than 1 order)
    const retargetedUsers = await User.findAll({
      attributes: [
        'id',
        [sequelize.fn('COUNT', sequelize.col('orders.id')), 'orderCount']
      ],
      include: [{
        model: require("../models").Order,
        as: 'orders',
        attributes: []
      }],
      where: { '$role.name$': 'Customer' },
      group: ['User.id'],
      having: sequelize.literal('COUNT(orders.id) > 1'),
      include: [{ model: require("../models").Role, as: "role" }]
    });

    res.json({
      success: true,
      data: {
        total: totalCustomers,
        new: newCustomers,
        retargeted: retargetedUsers.length,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching customer stats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
