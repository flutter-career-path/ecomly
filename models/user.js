const { Schema, model } = require('mongoose');
const userSchema = Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    validate: {
      validator: (value) => {},
      message: 'Password must be at least 8 charac',
    },
  },
  street: String,
  apartment: String,
  city: String,
  zip: String,
  country: String,
  phone: { type: String, required: true, trim: true },
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  cart: [{ type: Schema.Types.ObjectId, ref: 'CartProduct' }],
  isAdmin: { type: Boolean, default: false },
});

// cannot use the same email twice for
userSchema.index({ email: 1 }, { unique: true });

exports.User = model('User', userSchema);
