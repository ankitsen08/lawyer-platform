const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String,
    default: "Verified Client"
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 120
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 30,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'answered', 'closed'],
    default: 'open',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
