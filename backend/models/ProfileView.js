const mongoose = require('mongoose');

const profileViewSchema = new mongoose.Schema({
  lawyerId: {
    type: String,
    required: true,
    index: true
  },
  viewerId: {
    type: String, // Can be anonymous or client email
    default: 'anonymous'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ProfileView', profileViewSchema);
