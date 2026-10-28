const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    isProxy: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bid', bidSchema);
