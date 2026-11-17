const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client', 'lawyer'], required: true },
  
  // Client Profile & Contact/Location Details
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  smsConsent: { type: Boolean, default: false },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  preferredContactMethod: { type: String, enum: ['email', 'phone', 'sms', 'whatsapp'], default: 'email' },
  
  // Email Verification & Account Activation (Clients & Lawyers)
  isVerified: { type: Boolean, default: false, index: true },
  verificationToken: { type: String, trim: true, index: true },
  verificationTokenExpires: { type: Date },
  
  // Security & Audit Telemetry
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String, trim: true },
  
  // Client Case Dossier & Conflict Clearance
  caseProfile: {
    legalCategory: { type: String, trim: true, default: "General Practice / Civil Litigation" },
    legalSubCategory: { type: String, trim: true, default: "" },
    urgency: { type: String, enum: ['immediate', 'this_week', 'exploratory', 'emergency', 'immediate_week', 'planning'], default: 'this_week' },
    incidentDate: { type: String, trim: true, default: "" },
    opposingParty: { type: String, trim: true, default: "" },
    budgetRange: { type: String, enum: ['under_2k', '2k_5k', '5k_15k', '15k_plus', 'contingency', 'contingency_only', 'pro_bono'], default: 'contingency' },
    preferredFormat: { type: String, enum: ['zoom', 'phone', 'in_person'], default: 'zoom' },
    preferredContactMethod: { type: String, enum: ['email', 'phone', 'sms', 'whatsapp'], default: 'email' },
    smsNotifications: { type: Boolean, default: false },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    zipCode: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    attachments: [{
      name: { type: String, trim: true },
      size: { type: Number },
      mimeType: { type: String, trim: true },
      dataUrl: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  
  // Lawyer Profile
  name: { type: String, trim: true },
  firmName: { type: String, trim: true },
  hourlyRate: { type: String, default: "350" },
  specialty: { type: String, default: "General Practice", index: true },
  bio: { type: String },
  about: { type: String },
  practiceAreas: [{ type: String }],
  stateBarNumber: { type: String },
  location: { type: String, default: "United States", index: true },
  imageUrl: { type: String },
  onboarded: { type: Boolean, default: false },
  plan: { type: String, enum: ['Standard Tier', 'Premium Tier', 'Essential Tier', 'Enterprise Tier', 'Essential', 'Premium'], default: 'Standard Tier' },
  rating: { type: Number, default: 5.0 },
  reviewCount: { type: Number, default: 0 },
  experienceYears: { type: Number, default: 10 },
  consultationAvailability: { type: String, default: "Within 24 Hours" },
  freeConsultation: { type: Boolean, default: true },
  languages: [{ type: String, default: ['English'] }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
