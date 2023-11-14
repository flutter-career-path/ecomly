const { default: mongoose } = require('mongoose');
const { CartProduct } = require('../models/cart_product');
const { User } = require('../models/user');

exports.getUserCart = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cartProducts = await CartProduct.find({
      _id: { $in: user.cart },
    }).populate('product', 'name image price');
    if (!cartProducts) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    return res.json(cartProducts);
  } catch (err) {
    console.log('ERROR OCCURRED: ', err);
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.getUserCartCount = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({ cartCount: user.cart.length });
  } catch (err) {
    console.log('ERROR OCCURRED: ', err);
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.addToCart = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if the user's cart already contains a CartProduct with the same productId,
    // selectedSize, and selectedColour
    const cart = await CartProduct.find({ _id: { $in: user.cart } });
    const existingCartItem = cart.find(
      (item) =>
        item.product.equals(new mongoose.Types.ObjectId(req.body.productId)) &&
        item.selectedSize === req.body.selectedSize &&
        item.selectedColour === req.body.selectedColour
    );

    if (existingCartItem) {
      // If the same product with the same size and colour exists, increment the quantity
      existingCartItem.quantity += 1;
      await existingCartItem.save();
      return res.status(200).end();
    }

    // If not, create a new CartProduct
    const cartProduct = await new CartProduct({
      ...req.body,
      product: req.body.productId,
    }).save();

    if (!cartProduct) {
      return res
        .status(500)
        .json({ message: 'The Product could not be added to your cart' });
    }

    user.cart.push(cartProduct.id);
    await user.save();
    return res.status(201).json(cartProduct);
  } catch (err) {
    console.log('ERROR OCCURRED: ', err);
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.modifyProductQuantity = async function (req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cartProduct = await CartProduct.findByIdAndUpdate(
      req.params.cartProductId,
      req.body,
      { new: true }
    );
    if (!cartProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(cartProduct);
  } catch (err) {
    console.log('ERROR OCCURRED: ', err);
    return res.status(500).json({ type: err.name, message: err.message });
  }
};
