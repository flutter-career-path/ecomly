const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
  orderItems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem',
      required: true,
    },
  ],
  shippingAddress1: { type: String, required: true },
  shippingAddress12: String,
  city: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: true },
  status: {
    type: String,
    enum: [
      'pending',
      'processed',
      'shipped',
      'out-for-delivery',
      'delivered',
      'cancelled',
      'on-hold',
      'expired',
    ],
    required: true,
    default: 'pending',
  },
  statusHistory: {
    type: [String],
    enum: [
      'pending',
      'processed',
      'shipped',
      'out-for-delivery',
      'delivered',
      'cancelled',
      'on-hold',
      'expired',
    ],
    required: true,
    default: ['pending'],
  },
  totalPrice: Number,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateOrdered: { type: Date, default: Date.now },
});

exports.Order = mongoose.model('Order', orderSchema);
