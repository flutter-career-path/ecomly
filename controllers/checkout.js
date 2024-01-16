// This example sets up an endpoint using the Express framework.
// Watch this video to get started: https://youtu.be/rPR2aJ6XnAc.

const stripe = require('stripe')(process.env.STRIPE_KEY);
const { User } = require('../models/user');
const orderController = require('./orders');
const mailSender = require('../helpers/email_sender');
const { Product } = require('../models/product');
const mailBuilder = require('../helpers/order_complete_email_builder');
const jwt = require('jsonwebtoken');

exports.checkout = async (req, res) => {
  const accessToken = req.header('Authorization').replace('Bearer', '').trim();
  const tokenData = jwt.decode(accessToken);

  const user = await User.findById(tokenData.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found!' });
  }

  for (const cartItem of req.body.cartItems) {
    if (cartItem.images[0].includes('http:')) {
      cartItem['images'].splice(-1);
      cartItem['images'].push(
        'https://img.freepik.com/free-psd/isolated-cardboard-box_125540-1169.jpg?w=1060&t=st=1705342136~exp=1705342736~hmac=3b4449a587dd227ed0f2d66f0c0eca550f75a79dc0b19284d8624b4a91f66f6a'
      );
    }
    const product = await Product.findById(cartItem.product);
    if (!product) {
      return res.status(404).json({ message: `${cartItem.name} not found!` });
    } else if (product.countInStock < cartItem.quantity) {
      const message = `${product.name}\nOrder for ${cartItem.quantity}, but only ${product.countInStock} left in stock`;
      return res.status(400).json({ message });
    }
  }

  let customerId;
  if (user.paymentCustomerId) {
    customerId = user.paymentCustomerId;
  } else {
    const customer = await stripe.customers.create({
      metadata: {
        userId: tokenData.id,
        cart: JSON.stringify(req.body.cartItems.toString()),
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
              selectedSize: item.selectedSize ?? undefined,
              selectedColour: item.selectedColour ?? undefined,
            },
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      };
    }),
    billing_address_collection: 'auto',
    // allowed_countries
    shipping_address_collection: {
      allowed_countries: [
        'AC',
        'AD',
        'AE',
        'AF',
        'AG',
        'AI',
        'AL',
        'AM',
        'AO',
        'AQ',
        'AR',
        'AT',
        'AU',
        'AW',
        'AX',
        'AZ',
        'BA',
        'BB',
        'BD',
        'BE',
        'BF',
        'BG',
        'BH',
        'BI',
        'BJ',
        'BL',
        'BM',
        'BN',
        'BO',
        'BQ',
        'BR',
        'BS',
        'BT',
        'BV',
        'BW',
        'BY',
        'BZ',
        'CA',
        'CD',
        'CF',
        'CG',
        'CH',
        'CI',
        'CK',
        'CL',
        'CM',
        'CN',
        'CO',
        'CR',
        'CV',
        'CW',
        'CY',
        'CZ',
        'DE',
        'DJ',
        'DK',
        'DM',
        'DO',
        'DZ',
        'EC',
        'EE',
        'EG',
        'EH',
        'ER',
        'ES',
        'ET',
        'FI',
        'FJ',
        'FK',
        'FO',
        'FR',
        'GA',
        'GB',
        'GD',
        'GE',
        'GF',
        'GG',
        'GH',
        'GI',
        'GL',
        'GM',
        'GN',
        'GP',
        'GQ',
        'GR',
        'GS',
        'GT',
        'GU',
        'GW',
        'GY',
        'HK',
        'HN',
        'HR',
        'HT',
        'HU',
        'ID',
        'IE',
        'IL',
        'IM',
        'IN',
        'IO',
        'IQ',
        'IS',
        'IT',
        'JE',
        'JM',
        'JO',
        'JP',
        'KE',
        'KG',
        'KH',
        'KI',
        'KM',
        'KN',
        'KR',
        'KW',
        'KY',
        'KZ',
        'LA',
        'LB',
        'LC',
        'LI',
        'LK',
        'LR',
        'LS',
        'LT',
        'LU',
        'LV',
        'LY',
        'MA',
        'MC',
        'MD',
        'ME',
        'MF',
        'MG',
        'MK',
        'ML',
        'MM',
        'MN',
        'MO',
        'MQ',
        'MR',
        'MS',
        'MT',
        'MU',
        'MV',
        'MW',
        'MX',
        'MY',
        'MZ',
        'NA',
        'NC',
        'NE',
        'NG',
        'NI',
        'NL',
        'NO',
        'NP',
        'NR',
        'NU',
        'NZ',
        'OM',
        'PA',
        'PE',
        'PF',
        'PG',
        'PH',
        'PK',
        'PL',
        'PM',
        'PN',
        'PR',
        'PS',
        'PT',
        'PY',
        'QA',
        'RE',
        'RO',
        'RS',
        'RU',
        'RW',
        'SA',
        'SB',
        'SC',
        'SE',
        'SG',
        'SH',
        'SI',
        'SJ',
        'SK',
        'SL',
        'SM',
        'SN',
        'SO',
        'SR',
        'SS',
        'ST',
        'SV',
        'SX',
        'SZ',
        'TA',
        'TC',
        'TD',
        'TF',
        'TG',
        'TH',
        'TJ',
        'TK',
        'TL',
        'TM',
        'TN',
        'TO',
        'TR',
        'TT',
        'TV',
        'TW',
        'TZ',
        'UA',
        'UG',
        'US',
        'UY',
        'UZ',
        'VA',
        'VC',
        'VE',
        'VG',
        'VN',
        'VU',
        'WF',
        'WS',
        'XK',
        'YE',
        'YT',
        'ZA',
        'ZM',
        'ZW',
        'ZZ',
      ],
    },
    phone_number_collection: { enabled: true },
    customer: customerId,
    mode: 'payment',
    // appearance: {
    //   theme: isDarkMode ? 'night' : 'stripe',
    //   variables: {
    //     colorPrimary: '#524eb7',
    //     colorBackground: isDarkMode ? '#0e0d11' : '#f6f6f9',
    //     colorText: isDarkMode ? '#ffffff' : '#282344',
    //   },
    // },
    success_url: 'https://dbestech.biz/payment-success',
    cancel_url: 'https://dbestech.biz/cart',
  });

  res.status(201).json({ url: session.url });
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
        const orderItems = JSON.parse(customer.metadata.cart).map((item) => {
          return {
            quantity: item.quantity,
            product: item.product,
            cartProductId: item.cartProductId,
            productPrice: item.price,
            productName: item.name,
            productImage: item.images[0],
            selectedSize: item.selectedSize ?? undefined,
            selectedColour: item.selectedColour ?? undefined,
          };
        });
        const address = session.customer_details.address;
        const order = await orderController.addOrder(
          {
            orderItems: orderItems,
            shippingAddress1:
              address.line1 === 'N/A' ? address.line2 : address.line1,
            city: address.city,
            postalCode: address.postal_code,
            country: address.country,
            totalPrice: session.amount_total,
            phone: session.customer_details.phone,
            user: customer.metadata.userId,
            paymentId: session.payment_intent,
          },
          res
        );
        const user = await User.findByIdAndUpdate(
          customer.metadata.userId,
          { paymentCustomerId: session.customer },
          { new: true }
        );
        // send email
        await mailSender.sendMail(
          'Your Ecomly order',
          mailBuilder.buildEmail(
            user.name,
            order,
            session.customer_details.name
          )
        );
      })
      .catch((err) => console.log(err.message));
  } else {
    console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send().end();
};
