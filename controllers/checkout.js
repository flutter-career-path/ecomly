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
  const theme = req.query.theme;
  const isDarkMode = theme.toLowerCase() === 'dark';
  const session = await stripe.checkout.sessions.create({
    line_items: req.body.cartItems.map((item) => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.images,
            // description:
            metadata: {
              selectedSize: item.selectedSize,
              selectedColour: item.selectedColour,
            },
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      };
    }),
    billing_address_collection: 'auto',
    // allowed_countries
    shipping_address_collection: {},
    phone_number_collection: { enabled: true },
    customer: customerId,
    mode: 'payment',
    appearance: {
      theme: isDarkMode ? 'night' : 'stripe',
      variables: {
        colorPrimary: '#524eb7',
        colorBackground: isDarkMode ? '#0e0d11' : '#f6f6f9',
        colorText: isDarkMode ? '#ffffff' : '#282344',
      },
    },
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

  if (event.type === 'checkout.session.succeeded') {
    const session = event.data.object;

    stripe.customers
      .retrieve(session.customer)
      .then(async (customer) => {
        orderController.addOrder({}, res);
        // session.payment_intent
        await User.findByIdAndUpdate(
          customer.metadata.userId,
          { paymentCustomerId: session.customer },
          { new: true }
        );
        // send email
      })
      .catch((err) => console.log(err.message));
  } else {
    console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send().end();
};
