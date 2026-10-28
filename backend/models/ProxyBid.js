const mongoose = require('mongoose');

const proxyBidSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    maxAmount: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

proxyBidSchema.index({ listingId: 1, userId: 1 });

module.exports = mongoose.model('ProxyBid', proxyBidSchema);
