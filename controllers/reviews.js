const { Review } = require('../models/review');
const { Product } = require('../models/product');
const { User } = require('../models/user');
const jwt = require('jsonwebtoken');

exports.leaveReview = async function (req, res) {
  try {
    const user = await User.findById(req.body.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const review = await new Review({
      ...req.body,
      userName: user.name,
    }).save();
    if (!review) {
      return res.status(500).json({ message: 'The Review could not be added' });
    }

    /// Because we have the pre('save') hook, let's use save
    // const product = await Product.findByIdAndUpdate(
    //   req.params.id,
    //   { $push: { reviews: review.id } },
    //   { new: true }
    // );
    let product = await Product.findById(req.params.id);
    product.reviews.push(review.id);
    product = await product.save();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.status(201).json({ product, review });
  } catch (err) {
    console.log('ERROR OCCURRED: ', err);
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.getProductReviews = async function (req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const page = req.query.page ? +req.query.page : 1; // Default to page 1 if not specified
    const pageSize = 10; // Number of reviews per page, adjust as needed

    const accessToken = req
      .header('Authorization')
      .replace('Bearer', '')
      .trim();
    const tokenData = jwt.decode(accessToken);

    // Fetch user's reviews separately
    const userReviews = await Review.find({
      _id: { $in: product.reviews },
      user: tokenData.id,
    })
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    // Fetch remaining reviews for pagination
    const remainingReviews =
      (userReviews && userReviews.length < pageSize) || !userReviews
        ? await Review.find({
            _id: {
              $in: product.reviews,
              ...(userReviews && {
                $nin: userReviews.map((review) => review.id),
              }),
            },
          })
            .sort({ date: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize - (userReviews.length ?? 0))
        : [];

    // Concatenate user's reviews with the remaining reviews
    const allReviews =
      page === 1 ? [...userReviews, ...remainingReviews] : remainingReviews;

    console.log(userReviews?.length);
    console.log(allReviews.length);

    const processedReviews = [];
    for (const review of allReviews) {
      const user = await User.findById(review.user);
      if (!user) {
        processedReviews.push(review);
        continue;
      }
      let newReview;
      if (review.userName !== user.name) {
        review.userName = user.name;
        newReview = await review.save();
      }
      processedReviews.push(newReview ?? review);
    }
    return res.json(processedReviews);
  } catch (err) {
    console.log('ERROR OCCURRED: ', err);
    return res.status(500).json({ type: err.name, message: err.message });
  }
};
  
