const express = require('express');
const { Order } = require('../models/order');
const { OrderItem } = require('../models/order_item');
const { Product } = require('../models/product');
const mongoose = require('mongoose');
const { User } = require('../models/user');

const MAX_RETRIES = 3;

async function handleConflict(req, res, session, retries) {
  if (retries < MAX_RETRIES) {
    // Handle the conflict, wait a moment, and retry
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for a second
    return createOrderWithRetry(req, res, retries + 1);
  } else {
    // Maximum retries reached, handle it as you see fit
    await session.abortTransaction();
    await session.endSession();
    return res
      .status(409)
      .json({ message: 'Order conflict, please try again later' });
  }
}

async function createOrderWithRetry(req, res, retries) {
  retries = retries ?? 0;
  if (!mongoose.isValidObjectId(req.body.user)) {
    return res.status(500).json({ message: 'Invalid user!' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.body.user);
    if (!user) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    const orderItems = req.body.orderItems;
    const orderItemsIds = [];
    for (const orderItem of orderItems) {
      if (
        !mongoose.isValidObjectId(orderItem.product) ||
        !(await Product.findById(orderItem.product))
      ) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).json({
          message: 'Invalid product in the order',
        });
      }
      let orderItemModel = new OrderItem(orderItem);
      const product = await Product.findById(orderItem.product);
      orderItemModel.productPrice = product.price;
      orderItemModel.productName = product.name;
      orderItemModel.productImage = product.image;
      orderItemModel = await orderItemModel.save({ session });
      if (!orderItemModel || product.countInStock < orderItemModel.quantity) {
        await session.abortTransaction();
        await session.endSession();
        let message = `An order for product ${product.name} could not be created`;
        if (product.countInStock < orderItemModel.quantity) {
          if (product.countInStock == 0) {
            message += '\nOut of stock';
          } else {
            message += `\nOrder for ${orderItemModel.quantity}, but only ${product.countInStock} left in stock`;
          }
        }
        return res.status(500).json({ message });
      }

      const updatedProduct = await Product.findById(orderItem.product);
      if (updatedProduct.countInStock !== product.countInStock) {
        await session.abortTransaction();
        await session.endSession();
        return handleConflict(req, res, session, retries);
      }

      product.countInStock -= orderItemModel.quantity;
      await product.save({ session });
      orderItemsIds.push(orderItemModel._id);
    }

    req.body['orderItems'] = orderItemsIds;

    return await addOrder(session, req, res);
  } catch (err) {
    await session.abortTransaction();
    await session.endSession();

    return res.status(500).json({ type: err.name, message: err.message });
  }
}

async function addOrder(session, req, res) {
  req.body['totalPrice'] = await resolveOrderTotal(
    req.body.orderItems,
    session
  );
  const order = await new Order(req.body).save({ session });

  if (!order) {
    await session.abortTransaction();
    await session.endSession();
    return res.status(500).json({ message: 'The order could not be created' });
  }
  await session.commitTransaction();
  await session.endSession();

  return res.status(201).json(order);
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

exports.addOrder = async (req, res) => {
  await createOrderWithRetry(req, res, 0);
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .select('-statusHistory')
      .populate('user', 'name email')
      // newest to oldest
      .sort({ dateOrdered: -1 })
      // oldest to newest is by default.... .sort('dateOrdered')
      .populate({
        path: 'orderItems',
        populate: {
          path: 'product',
          select: 'name',
          populate: { path: 'category', select: 'name' },
        },
      });
    if (!orders) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .select('-statusHistory')
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
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    if (req.params.id.toLowerCase() === 'count') {
      return res
        .status(403)
        .json({ message: 'This is an admin route. Access forbidden' });
    }
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
