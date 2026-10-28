const mongoose = require('mongoose');
const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  keyword: { type: String, required: true },
  maxPrice: { type: Number, required: true },
  category: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Alert', alertSchema);
