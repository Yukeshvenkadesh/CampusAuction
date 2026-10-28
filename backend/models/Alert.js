const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    keyword: { type: String, required: true },
    maxPrice: { type: Number, required: true },
    category: { type: String, default: 'all' },
    active: { type: Boolean, default: true },
    notifications: [
      {
        listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
        matchedPrice: { type: Number },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
