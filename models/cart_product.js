const { Schema, model } = require('mongoose');

const cartProductSchema = Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, default: 1 },
  selectedSize: String,
  selectedColour: String,
});

cartProductSchema.set('toJSON', { virtuals: true });
cartProductSchema.set('toObject', { virtuals: true });

exports.CartProduct = model('CartProduct', cartProductSchema);
