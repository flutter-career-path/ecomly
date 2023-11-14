const { Schema, model } = require('mongoose');

const cartProductSchema = Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, default: 1 },
  selectedSize: String,
  selectedColour: String,
});

exports.CartProduct = model('CartProduct', cartProductSchema);
