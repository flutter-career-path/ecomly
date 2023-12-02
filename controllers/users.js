const { User } = require('../models/user');

exports.getUsers = async (_, res) => {
  try {
    const users = await User.find().select('name email id isAdmin');
    if (!users) {
      return res.status(404).json({ message: 'Users not found' });
    }
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-passwordHash -cart -resetPasswordOtp, -resetPasswordOtpExpires'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user._doc.id = req.params.id;
    user._doc.passwordHash = undefined;
    return res.json(user._doc);
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};
