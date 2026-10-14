const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String
  },
  clientEmail: {
    type: String
  },
  clientPhone: {
    type: String
  },
  lawyerId: {
    type: String,
    required: true,
    index: true
  },
  lawyerName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  zoomLink: {
    type: String,
    default: "https://zoom.us/j/123456789"
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming',
    index: true
  },
  topic: {
    type: String,
    default: "General Legal Consultation"
  },
  consultationFee: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);
