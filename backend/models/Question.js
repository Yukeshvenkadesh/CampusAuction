const mongoose = require('mongoose');
const questionSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  answer: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Question', questionSchema);
