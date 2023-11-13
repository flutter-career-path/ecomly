const express = require('express');
const router = express.Router();

const usersController = require('../controllers/users');
const wishlistController = require('../controllers/wishlists');

router.get('/', usersController.getUsers);

router.get('/:id', usersController.getUserById);

router.get('/:id/wishlist', wishlistController.getUserWishlist);

module.exports = router;
