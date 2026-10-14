const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    index: true
  },
  lawyerId: {
    type: String,
    required: true,
    index: true
  },
  lawyerName: {
    type: String
  },
  lawyerFirm: {
    type: String
  },
  lawyerSpecialty: {
    type: String
  },
  lawyerImage: {
    type: String
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 20
  },
  upvotes: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Answer', answerSchema);
