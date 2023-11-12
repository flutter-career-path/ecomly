const { Schema, model } = require('mongoose');

const cartProductSchema = Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, default: 1 },
});

exports.CartProduct = model('CartProduct', cartProductSchema);
