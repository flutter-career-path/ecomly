const { Schema, model } = require('mongoose');

const productSchema = Schema({});

exports.Product = model('Product', productSchema);
