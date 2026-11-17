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
  clientCity: {
    type: String,
    trim: true
  },
  clientState: {
    type: String,
    trim: true
  },
  clientZipCode: {
    type: String,
    trim: true
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'sms', 'whatsapp'],
    default: 'email'
  },
  smsConsent: {
    type: Boolean,
    default: false
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
  format: {
    type: String,
    enum: ['zoom', 'phone', 'in_person'],
    default: 'zoom'
  },
  legalCategory: {
    type: String,
    trim: true
  },
  legalSubCategory: {
    type: String,
    trim: true
  },
  urgency: {
    type: String,
    default: 'this_week'
  },
  incidentDate: {
    type: String,
    trim: true
  },
  budgetRange: {
    type: String,
    trim: true
  },
  caseSummary: {
    type: String,
    trim: true
  },
  opposingParty: {
    type: String,
    trim: true
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
