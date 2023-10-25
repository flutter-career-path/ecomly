const { Schema } = require('mongoose');

const orderSchema = Schema({});

exports.Order = model('Order', orderSchema);
