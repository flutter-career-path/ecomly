const { Schema, model } = require('mongoose');

const productSchema = Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0.0 },
  colors: [{ type: String }],
  image: { type: String, required: true },
  images: [{ type: String }],
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
  sizes: [{ type: String }],
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  genderAgeCategory: {
    type: String,
    enum: ['men', 'women', 'unisex', 'kids'],
  },
  countInStock: { type: Number, required: true, min: 0, max: 255 },
  dateAdded: { type: Date, default: Date.now },
});

productSchema.virtual('numberOfReviews').get(() => {
  if (this.reviews) {
    return this.reviews.length;
  }
  return 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

exports.Product = model('Product', productSchema);
