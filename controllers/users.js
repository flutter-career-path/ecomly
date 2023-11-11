const { User } = require('../models/user');

exports.getUsers = async (_, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .select('name email id');
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
      '-passwordHash, -_id'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const token =
      req.header('Authorization')?.split(' ')[1] ||
      req.headers.authorization?.split(' ')[1];
    const userDoc = user._doc;
    userDoc['passwordHash'] = undefined;
    userDoc['id'] = req.params.id;
    return res.json({ ...userDoc, token });
  } catch (err) {
    return res.status(500).json({ type: err.name, message: err.message });
  }
};
