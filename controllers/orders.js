const { Order } = require('../models/order');
const { OrderItem } = require('../models/order_item');
const { Product } = require('../models/product');
const mongoose = require('mongoose');
const { User } = require('../models/user');
const { CartProduct } = require('../models/cart_product');

const MAX_RETRIES = 3;

async function handleConflict(orderData, res, session, retries) {
  if (retries < MAX_RETRIES) {
    // Handle the conflict, wait a moment, and retry
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for a second
    return createOrderWithRetry(orderData, res, retries + 1);
  } else {
    // Maximum retries reached, handle it as you see fit
    await session.abortTransaction();
    await session.endSession();
    return console.error(
      'ORDER CREATION FAILED: Order conflict, please try again later'
    );
  }
}

async function createOrderWithRetry(orderData, res, retries) {
  retries = retries ?? 0;
  if (!mongoose.isValidObjectId(orderData.user)) {
    return res.status(500).json({ message: 'Invalid user!' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(orderData.user);
    if (!user) {
      await session.abortTransaction();
      await session.endSession();
      return console.error('ORDER CREATION FAILED: User not found');
    }

    const orderItems = orderData.orderItems;
    const orderItemsIds = [];
    for (const orderItem of orderItems) {
      if (
        !mongoose.isValidObjectId(orderItem.product) ||
        !(await Product.findById(orderItem.product))
      ) {
        await session.abortTransaction();
        await session.endSession();
        return console.error(
          'ORDER CREATION FAILED: Invalid product in the order'
        );
      }
      const cartProduct = await CartProduct.findById(orderItem.cartProductId);
      if (!cartProduct) {
        await session.abortTransaction();
        await session.endSession();
        return console.error(
          'ORDER CREATION FAILED: Invalid product in the order'
        );
      }
      let orderItemModel = new OrderItem(orderItem);
      const product = await Product.findById(orderItem.product);
      if (!orderItemModel) {
        await session.abortTransaction();
        await session.endSession();
        const message = `An order for product ${product.name} could not be created`;
        console.error('ORDER CREATION FAILED: ', message);
        return handleConflict(orderData, res, session, retries);
      }

      if (!cartProduct.reserved) {
        product.countInStock -= orderItemModel.quantity;
        console.log('SAVING ---- ', product.id);
        await product.save({ session });
        console.log('DONE SAVING ---- ', product.id);
      }
      orderItemsIds.push(orderItemModel._id);

      // Remove the CartProduct after processing the orderItem within the same session
      await CartProduct.findByIdAndDelete(orderItem.cartProductId).session(
        session
      );
      user.cart.pull(cartProduct.id);
      await user.save({ session });
    }

    orderData['orderItems'] = orderItemsIds;

    return await addOrder(session, orderData, res);
  } catch (err) {
    await session.abortTransaction();
    await session.endSession();

    return console.error(
      'ORDER CREATION FAILED: ',
      JSON.stringify({
        type: err.name,
        message: err.message,
      })
    );
  }
}

async function addOrder(session, orderData, res) {
  orderData['totalPrice'] = await resolveOrderTotal(
    orderData.orderItems,
    session
  );
  let order = new Order(orderData);
  order.status = 'processed';
  order.statusHistory.push('processed');
  await order.save();

  order = await order.save({ session });

  if (!order) {
    await session.abortTransaction();
    await session.endSession();
    return console.error(
      'ORDER CREATION FAILED: The order could not be created'
    );
  }

  await session.commitTransaction();
  await session.endSession();

  return order;
}

async function resolveOrderTotal(orderItemsIds, session) {
  const totalPrices = await Promise.all(
    orderItemsIds.map(async (orderItemId) => {
      const orderItem = await OrderItem.findOne(orderItemId)
        .session(session)
        .populate('product', 'price');
      return orderItem.product.price * orderItem.quantity;
    })
  );
  return totalPrices.reduce((a, b) => a + b, 0);
}

exports.addOrder = async (orderData, res) => {
  await createOrderWithRetry(orderData, res, 0);
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate({
        path: 'orderItems',
        populate: {
          path: 'product',
          select: 'name',
          populate: { path: 'category', select: 'name' },
        },
      })
      .sort({ dateOrdered: -1 });
    if (!orders) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const completed = [];
    const active = [];
    const cancelled = [];
    for (const order of orders) {
      if (order.status === 'delivered') {
        completed.push(order);
      } else if (['cancelled', 'expired'].includes(order.status)) {
        cancelled.push(order);
      } else {
        active.push(order);
      }
    }
    return res.json({ total: orders.length, active, completed, cancelled });
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('-statusHistory')
      .populate('user', 'name email')
      .populate({
        path: 'orderItems',
        populate: {
          path: 'product',
          populate: { path: 'category', select: 'name' },
        },
      });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

// you can implement this if you want and add a cron job to return their money or
// have the admins do this manually, send a notification to the admin dashboard to return their money
// exports.cancelOrder = async (req, res)
