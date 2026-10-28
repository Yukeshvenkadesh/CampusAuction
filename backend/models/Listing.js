const mongoose = require('mongoose');
const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ['cycle', 'calculator', 'books', 'electronics', 'other'], required: true },
  description: { type: String, required: true },
  condition: { type: String, required: true },
  photos: [{ type: String }],
  startingPrice: { type: Number, required: true },
  currentBid: { type: Number, required: true },
  minIncrement: { type: Number, required: true },
  closingTime: { type: Date, required: true },
  status: { type: String, enum: ['active', 'sold', 'unsold', 'cancelled'], default: 'active' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Listing', listingSchema);
