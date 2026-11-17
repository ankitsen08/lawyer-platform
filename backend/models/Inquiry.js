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
  smsConsent: {
    type: Boolean,
    default: false
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  issue: {
    type: String,
    required: true,
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  urgency: {
    type: String,
    enum: ['immediate', 'this_week', 'exploratory', 'urgent_24h', 'general'],
    default: 'this_week'
  },
  incidentDate: {
    type: String,
    trim: true
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'sms', 'whatsapp', 'text'],
    default: 'email'
  },
  opposingParty: {
    type: String,
    trim: true
  },
  budgetRange: {
    type: String,
    enum: ['under_2k', '2k_5k', '5k_15k', '15k_plus', 'contingency', 'contingency_only', 'pro_bono'],
    default: 'contingency'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    name: { type: String, trim: true },
    size: { type: Number },
    mimeType: { type: String, trim: true },
    dataUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  source: {
    type: String,
    enum: ['direct_inquiry', 'onboarding_wizard', 'consultation'],
    default: 'direct_inquiry'
  },
  conflictStatus: {
    type: String,
    enum: ['pending', 'cleared', 'conflict_found'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'conflict_cleared', 'contacted', 'closed'],
    default: 'new'
  }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
