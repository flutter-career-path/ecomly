const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin');

router.get('/users/count', adminController.getUserCount);

// TODO: TEST THIS ROUTE
router.delete('/users/:id', adminController.deleteUser);

// CATEGORY
router.post('/categories', adminController.addCategory);

router.put('/categories/:id', adminController.editCategory);

router.delete('/categories/:id', adminController.deleteCategory);

// ORDER
router.get('/orders/count', adminController.getOrdersCount);

router.put('/orders/:id', adminController.changeOrderStatus);

router.delete('/order/:id', adminController.deleteOrder);

// PRODUCTS

router.get('products/count', adminController.getProductsCount);

router.post('/products/', adminController.addProduct);

router.put('/products/:id', adminController.editProduct);

router.delete('/products/:id/images', adminController.deleteProductImages);

router.delete('/products/:id', adminController.deleteProduct);

module.exports = router;
