const { Schema, model } = require('mongoose');

const orderItemSchema = Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: { type: Number, default: 1 },
});

exports.OrderItem = model('OrderItem', orderItemSchema);
