const mongoose = require('mongoose');

const savedAttorneySchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  lawyerId: {
    type: String,
    required: true,
    index: true
  }
}, { timestamps: true });

// Prevent duplicate saves
savedAttorneySchema.index({ clientId: 1, lawyerId: 1 }, { unique: true });

module.exports = mongoose.model('SavedAttorney', savedAttorneySchema);
