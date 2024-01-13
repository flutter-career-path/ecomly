const router = require('express').Router();

const checkoutController = require('../controllers/checkout');

router.post('/', checkoutController.checkout);
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  checkoutController.webhook
);

module.exports = router;
