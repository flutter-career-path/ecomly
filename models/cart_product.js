const { Schema, model } = require('mongoose');

const cartProductSchema = Schema({
  product: {},
});

exports.CartProduct = model('CartProduct', cartProductSchema);
