const { Schema, model } = require('mongoose');

const categorySchema = Schema({});

exports.Category = model('Category', categorySchema);
