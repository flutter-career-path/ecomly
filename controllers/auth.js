const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { Token } = require('../models/token');
const router = express.Router();

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
      return res
        .status(409)
        .json({
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
    const user = await User.findOne({ email });
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
