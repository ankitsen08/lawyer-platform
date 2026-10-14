const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client', 'lawyer'], required: true },
  
  // Client Profile
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  savedAttorneys: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Lawyer Profile
  name: { type: String, trim: true },
  firmName: { type: String, trim: true },
  hourlyRate: { type: String, default: "350" },
  specialty: { type: String, default: "General Practice", index: true },
  bio: { type: String },
  about: { type: String },
  practiceAreas: [{ type: String }],
  stateBarNumber: { type: String },
  isVerified: { type: Boolean, default: false },
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
