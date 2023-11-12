const { Product } = require('../models/product');

exports.getProducts = async (_, res) => {
  try {
    const products = await Product.find();
    if (!products) {
      return res.status(404).json({ message: 'Products not found' });
    }
    return res.json(products);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    if (req.params.id.toLowerCase() === 'count') {
      return res
        .status(403)
        .json({ message: 'This is an admin route. Access Forbidden.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
