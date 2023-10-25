const { Schema } = require('mongoose');

const userSchema = Schema({});

exports.User = model('User', userSchema);
