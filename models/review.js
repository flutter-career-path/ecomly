const { Schema, model } = require('mongoose');

const reviewSchema = Schema({});

exports.Review = model('Review', reviewSchema);
