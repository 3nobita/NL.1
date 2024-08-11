const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  price: String,
  categories: [String], // Array to store property categories
  imageUrl: String // Add imageUrl field
});

module.exports = mongoose.model('Property', propertySchema);
