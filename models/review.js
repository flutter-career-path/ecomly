const { Schema, model } = require('mongoose');

const reviewSchema = Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  comment: { type: String, required: true, trim: true },
  rating: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

exports.Review = model('Review', reviewSchema);
