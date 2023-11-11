const cron = require('node-cron');
const { Product } = require('../models/product');
const { Order } = require('../models/order');

cron.schedule('0 0 * * *', async function () {
  try {
    const now = new Date();
    console.log('CRON job started at', now);

    // Find pending orders older than 24 hours
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const pendingOrders = await Order.find({
      status: 'pending',
      createdAt: { $lt: twentyFourHoursAgo },
    });

    for (const order of pendingOrders) {
      // Restore product quantities
      for (const orderItem of order.orderItems) {
        const product = await Product.findById(orderItem.product);
        if (product) {
          product.countInStock += orderItem.quantity;
          await product.save();
        }
      }

      // Update the order status to canceled
      order.status = 'expired';
      await order.save();
    }

    console.log('CRON job completed at', new Date());
  } catch (error) {
    console.error('CRON job error:', error);
  }
});
