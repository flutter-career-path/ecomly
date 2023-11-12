const express = require('express');
const productsController = require('../controllers/products');

const router = express.Router();

router.get('/', productsController.getProducts);

// When /products/count is called without the /admin, it will redirect to this route and "count" will be used as id
router.get('/:id', productsController.getProductById);


module.exports = router;
