const { Schema, model } = require('mongoose');

const userSchema = Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  street: String,
  apartment: String,
  city: String,
  zip: String,
  country: String,
  phone: { type: String, required: true, trim: true },
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  cart: [{ type: Schema.Types.ObjectId, ref: 'CartProduct' }],
  isAdmin: { type: Boolean, default: false },
  resetPasswordOtp: Number,
  resetPasswordOtpExpires: Date,
});

// cannot use the same email twice for
userSchema.index({ email: 1 }, { unique: true });
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

exports.User = model('User', userSchema);
