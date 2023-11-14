const express = require('express');
const router = express.Router();

const usersController = require('../controllers/users');
const wishlistController = require('../controllers/wishlists');
const cartController = require('../controllers/cart');

router.get('/', usersController.getUsers);

router.get('/:id', usersController.getUserById);

router.get('/:id/wishlist', wishlistController.getUserWishlist);

router.post('/:id/wishlist', wishlistController.addToWishlist);

router.delete(
  '/:id/wishlist/:productId',
  wishlistController.removeFromWishlist
);

router.get('/:id/cart', cartController.getUserCart);

router.get('/:id/cart/count', cartController.getUserCartCount);

router.post('/:id/cart/', cartController.addToCart);

router.put('/:id/cart/:cartProductId', cartController.modifyProductQuantity);


module.exports = router;
