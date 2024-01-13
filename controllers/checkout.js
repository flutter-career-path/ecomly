// This example sets up an endpoint using the Express framework.
// Watch this video to get started: https://youtu.be/rPR2aJ6XnAc.

const stripe = require('stripe')(process.env.STRIPE_KEY);
const { User } = require('../models/user');
const orderController = require('./orders');

exports.checkout = async (req, res) => {
  const accessToken = req.header('Authorization').replace('Bearer', '').trim();
  const tokenData = jwt.decode(accessToken);

  const user = await User.findById(tokenData.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found!' });
  }
  let customerId;
  if (user.paymentCustomerId) {
    customerId = user.paymentCustomerId;
  } else {
    const customer = await stripe.customers.create({
      metadata: {
        userId: tokenData.id,
        cart: JSON.stringify(req.body.cartItems),
      },
    });
    customerId = customer.id;
  }
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'T-shirt',
            // images: [],
            // description:
            // metadata
          },
          unit_amount: 2000, // x 100
        },
        quantity: 1,
      },
    ],
    phone_number_collection: { enabled: true },
    customer: customerId,
    mode: 'payment',
    success_url: 'https://dbestech.biz/payment-success',
    cancel_url: 'https://dbestech.biz/cart',
  });

  res.status(303).json({ url: session.url });
};

exports.webhook = (req, res) => {
  const sig = req.headers['stripe-signature'];

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).json({ message: `Webhook Error: ${err.message}` });
    return;
  }

  const accessToken = req.header('Authorization').replace('Bearer', '').trim();
  const tokenData = jwt.decode(accessToken);

  if (event.type === 'checkout.session.succeeded') {
    const checkoutIntentSucceeded = event.data.object;
    stripe.customers
      .retrieve(checkoutIntentSucceeded.customer)
      .then((customer) => {
        orderController.addOrder({}, res);
        // send email
      })
      .catch((err) => console.log(err.message));
  } else {
    console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send().end();
};
