// Object destructuring, the 'require...' is returning a new model, so,
// we Create another new model and assign all the values of the first one to the new one we created
const { Schema, model } = require('mongoose');

const categorySchema = Schema({
  name: { type: String, required: true },
  colour: { type: String, default: '#000000' },
  icon: String,
});

exports.Category = model('Category', categorySchema);
