const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { Token } = require('../models/token');
const nodemailer = require('nodemailer');

const { validationResult } = require('express-validator'); // Import express-validator

exports.register = async function (req, res) {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param, // The field name
      message: error.msg, // The user-friendly error message
    }));
    return res.status(400).json({ errors: errorMessages });
  }

  try {
    let user = new User({
      ...req.body,
      passwordHash: bcrypt.hashSync(req.body.password, 8),
    });
    user = await user.save();
    if (!user) {
      return res.status(500).json({ message: 'Could not create a new user' });
    }
    user.passwordHash = undefined;
    return res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('email_1 dup key')) {
      return res.status(409).json({
        type: 'AuthError',
        message: 'User with that email already exists!.',
      });
    }
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('-wishlist -cart');
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found!\nCheck your email and try again' });
    }
    if (bcrypt.compareSync(password, user.passwordHash)) {
      const accessToken = jwt.sign(
        { id: user.id, isAdmin: user.isAdmin },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: '24h',
        }
      );

      const refreshToken = jwt.sign(
        { id: user.id, isAdmin: user.isAdmin },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: '60d',
        }
      );

      const token = await Token.findOne({ userId: user.id });
      if (token) await token.deleteOne();
      await new Token({ userId: user.id, accessToken, refreshToken }).save();

      user.passwordHash = undefined;
      return res.json({ ...user._doc, accessToken, refreshToken });
    }
    return res.status(400).json({ message: 'Incorrect password!' });
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const accessToken = req.header('Authorization');
    if (!accessToken) return res.json(false);
    const token = Token.findOne({ accessToken });

    if (!token) return res.json(false);
    const tokenData = jwt.decode(token.refreshToken);

    const user = await User.findById(tokenData.id);
    if (!user) return res.json(false);

    const isValid = jwt.verify(
      token.refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!isValid) return res.json(false);

    return res.json(true);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user with the provided email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: 'User with that email does NOT exist' });
    }

    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Save the OTP and its expiration time to the user document
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 600000; // OTP expires in 10 minutes

    await user.save();

    // Send an email with the OTP
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Use your email service provider
      auth: {
        user: process.env.EMAIL, // Your email address
        pass: process.env.EMAIL_PASSWORD, // Your email password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending email' });
      }
      console.log('Email sent:', info.response);
      return res.json({ message: 'Password reset OTP sent to your email' });
    });
  } catch (error) {
    console.error('Reset Password error:', error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};

exports.verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the user with the provided email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the OTP and its expiration time are valid
    if (
      user.resetPasswordOtp !== otp ||
      Date.now() > user.resetPasswordOtpExpires
    ) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Reset the user's OTP fields
    user.resetPasswordOtp = 1;
    user.resetPasswordOtpExpires = undefined;

    await user.save();

    return res.json({ message: 'OTP confirmed successfully' });
  } catch (error) {
    console.error('Reset Password error:', error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find the user with the provided email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the OTP and its expiration time are valid
    if (user.resetPasswordOtp !== 1) {
      return res
        .status(401)
        .json({ message: 'Confirm OTP before resetting password' });
    }

    // Reset the user's password
    user.passwordHash = bcrypt.hashSync(newPassword, 8);

    // Reset the user's OTP fields
    user.resetPasswordOtp = undefined;

    await user.save();

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset Password error:', error);
    return res.status(500).json({ type: error.name, message: error.message });
  }
};