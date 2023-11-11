const { CartProduct } = require('../models/cart_product');
const { OrderItem } = require('../models/order_item');
const { Order } = require('../models/order');
const { User } = require('../models/user');
const { Category } = require('../models/category');
const util = require('util');
const media_helper = require('../helpers/media_helper');
const { Product } = require('../models/product');

exports.getUserCount = async (_, res) => {
  try {
    const userCount = await User.countDocuments();
    if (!userCount) {
      return res.status(500).json({ message: 'Could not count users' });
    }
    return res.json({ userCount });
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Remove user's orders and associated order items
    await Order.deleteMany({ user: userId });
    await OrderItem.deleteMany({ user: userId });

    // Remove user's cart products
    await CartProduct.deleteMany({ user: userId });

    // Remove references to cart products from the user document
    await User.findByIdAndUpdate(userId, {
      $pull: { cartProducts: { $exists: true } },
    });

    // Remove user's reviews
    await Review.deleteMany({ user: userId });

    // Finally, remove the user
    const deletedUser = await User.findByIdAndRemove(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

// CATEGORY

exports.addCategory = async (req, res) => {
  try {
    const { name, icon, colour } = req.body;
    let category = new Category({ name: name, icon: icon, colour: colour });

    category = await category.save();
    if (!category)
      return res
        .status(500)
        .json({ message: 'The category could not be created' });

    res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const { name, icon, colour } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, icon, colour },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = (req, res) => {
  Category.findByIdAndRemove(req.params.id)
    .then((category) => {
      if (category) {
        return res.status(204).end();
      }
      return res.status(404).json({ message: 'Category not found' });
    })
    .catch((err) => {
      return res.status(500).json({ message: err.message });
    });
};

// ORDER

exports.getOrdersCount = async (_, res) => {
  try {
    const count = await Order.countDocuments();
    if (!count) {
      return res.status(500).json({ message: 'Could not count orders' });
    }

    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.changeOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status; // Assuming the new status is in the request body

    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const statusTransitions = {
      pending: ['processed', 'cancelled', 'expired'],
      processed: ['shipped', 'cancelled', 'on-hold'],
      shipped: ['out-for-delivery', 'cancelled', 'on-hold'],
      'out-for-delivery': ['delivered', 'cancelled'],
      'on-hold': ['cancelled', 'shipped', 'out-for-delivery'],
      // No further transitions for cancelled orders
      // No further transitions for expired orders
      // No further transitions for delivered orders....You could add refund and return system if you want
    };

    // Check if the requested status is valid and allowed
    if (
      order.status !== newStatus &&
      statusTransitions[order.status] &&
      statusTransitions[order.status].includes(newStatus)
    ) {
      // Add the old status to the statusHistory
      if (!order.statusHistory.includes(order.status)) {
        order.statusHistory.push(order.status);
      }

      // Update the order status
      order.status = newStatus;

      // Save the updated order
      order = await order.save();

      return res.json(order);
    } else {
      return res.status(400).json({
        message: `Invalid status update\nStatus cannot go directly from ${order.status} to ${newStatus}`,
      });
    }
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndRemove(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    for (const orderItemId of order.orderItems) {
      await OrderItem.findByIdAndRemove(orderItemId);
    }
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

// PRODUCT

exports.getProductsCount = async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    if (!productCount) {
      return res.status(500).json({ message: 'Could not count products' });
    }
    return res.json({ productCount });
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    // always make sure to call your middleware first since we aren't putting it directly in the router's arguments
    const mainImageUpload = util.promisify(media_helper.upload.single('image'));
    const galleryUpload = util.promisify(media_helper.upload.array('images'));

    await mainImageUpload(req, res);
    await galleryUpload(req, res);

    const category = await Category.findById(req.body.category);
    if (!category) return res.status(404).json({ message: 'Invalid Category' });

    const image = req.file;
    if (!image) return res.status(404).json({ message: 'No file found' });

    // this will fetch the filename from our setup at the top
    const filename = req.file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads`;
    req.body['image'] = `${basePath}/${filename}`;

    const gallery = req.files;
    const imagePaths = [];
    if (gallery) {
      for (const image in gallery) {
        const filename = image.filename;
        const basePath = `${req.protocol}://${req.get('hose')}/public/uploads`;
        const imagePath = `${basePath}/${filename}`;
        imagePaths.push(imagePath);
      }
    }

    if (imagePaths.length > 0) {
      req.body['images'] = imagePaths;
    }

    let product = new Product(req.body);
    product = await product.save();
    if (!product) {
      return res
        .status(500)
        .json({ message: 'The product could not be created' });
    }
    return res.status(201).json(product);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(err.code).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ type: err.name, message: err.message });
    }
    return res.status(500).json({ message: err.message, type: err.name });
  }
};

exports.editProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Invalid Product' });
    }
    const galleryUpdate = req.files != undefined;
    if (galleryUpdate) {
      const product = await Product.findById(req.params.id);
      if (!product)
        return res.status(404).json({ message: 'Product not found' });

      const limit = 10 - product.images.length;

      const galleryUpload = util.promisify(
        media_helper.upload.array('images', limit)
      );

      await galleryUpload(req, res);

      const images = req.files;
      const imagePaths = [];
      for (const image of images) {
        const filename = image.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads`;
        const imagePath = `${basePath}/${filename}`;
        imagePaths.push(imagePath);
      }
      req.body['images'] = [...product.images, ...imagePaths];
    }
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category)
        return res.status(404).json({ message: 'Invalid Category' });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(product);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(err.code).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ type: err.name, message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteProductImages = async (req, res) => {
  try {
    const productId = req.params.id;
    const { deletedImageURLs } = req.body;

    // Validate productId and deletedImageURLs
    if (
      !mongoose.isValidObjectId(productId) ||
      !Array.isArray(deletedImageURLs)
    ) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Delete the images
    await media_helper.deleteImages(deletedImageURLs);
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Remove deleted images from the product.images array
    product.images = product.images.filter(
      (image) => !deletedImageURLs.includes(image)
    );

    // Save the updated product
    await product.save();

    return res.status(204).end(); // 204 No Content for a successful deletion
  } catch (error) {
    console.error(`Error deleting product: ${error.message}`);
    // Handle file not found explicitly
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Handle other errors
    console.error(`Error deleting image: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};

// Function to delete a product and its related data
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(404).json({ message: 'Invalid Product' });
    }

    // Find the product to get related data
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete related images
    await media_helper.deleteImages([...product.images, product.image]);

    // Delete associated reviews
    await Review.deleteMany({ _id: { $in: product.reviews } });

    // Delete the product
    await Product.findByIdAndDelete(productId);

    return res.status(204).end(); // 204 No Content for a successful deletion
  } catch (error) {
    console.error(`Error deleting product: ${error.message}`);
    // Handle file not found explicitly
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Handle other errors
    console.error(`Error deleting image: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};
