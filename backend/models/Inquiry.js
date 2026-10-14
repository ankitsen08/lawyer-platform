const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  lawyerId: {
    type: String,
    required: true,
    index: true
  },
  lawyerName: {
    type: String
  },
  clientId: {
    type: String
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  issue: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new'
  }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
