const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Listing = require('../models/Listing');
const Bid = require('../models/Bid');
const User = require('../models/User');

/**
 * Natural language helper to parse intent, keywords, categories, and budget constraints
 */
function parseNaturalLanguagePrompt(prompt, budgetLimit) {
  const text = (prompt || '').toLowerCase().trim();

  // 1. Detect Category
  let category = null;
  if (/cycle|bicycle|bike|pedal/i.test(text)) {
    category = 'cycle';
  } else if (/calc|calculator|casio|fx|scientific/i.test(text)) {
    category = 'calculator';
  } else if (/book|notes|textbook|guide|syllabus|author|sem/i.test(text)) {
    category = 'books';
  } else if (/electronic|headphone|earbud|charger|laptop|mouse|keyboard|gadget/i.test(text)) {
    category = 'electronics';
  } else if (/hostel|table|chair|lamp|mattress|furniture/i.test(text)) {
    category = 'other';
  }

  // 2. Extract Budget Limit from text (e.g. "under 2000", "below ₹1,500", "max 800")
  let extractedBudget = null;
  const budgetMatch = text.match(/(?:under|below|less than|within|max|budget of|capped at|up to|₹)\s*(\d+(?:,\d+)*)/i);
  if (budgetMatch && budgetMatch[1]) {
    extractedBudget = parseFloat(budgetMatch[1].replace(/,/g, ''));
  }

  const finalBudget =
    budgetLimit && !isNaN(Number(budgetLimit)) && Number(budgetLimit) > 0
      ? Number(budgetLimit)
      : extractedBudget || 999999;

  // 3. Extract Keyword (clean prompt of common query words)
  let cleanKeyword = text
    .replace(/(?:find|search|get|show|me|a|an|the|for|looking|need|want|under|below|less than|within|max|budget of|capped at|up to|₹|\$|\d+)/gi, '')
    .trim();

  // If keyword ended up blank but category was detected, use category
  if (!cleanKeyword && category) {
    cleanKeyword = category;
  }

  return {
    category,
    cleanKeyword,
    maxBudget: finalBudget,
    originalPrompt: prompt,
  };
}

/**
 * 1. POST /api/ai/find
 * Natural language search & matching engine with intelligent bidding assessment
 */
router.post('/ai/find', async (req, res) => {
  try {
    const { prompt, budgetLimit, userId } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a search prompt or question.' });
    }

    const parsed = parseNaturalLanguagePrompt(prompt, budgetLimit);

    // Build database query
    const dbQuery = {
      status: 'active',
      closingTime: { $gt: new Date() },
    };

    if (parsed.category) {
      dbQuery.category = parsed.category;
    }

    if (parsed.cleanKeyword && parsed.cleanKeyword.length > 1) {
      const regex = new RegExp(parsed.cleanKeyword.split(/\s+/).join('|'), 'i');
      dbQuery.$or = [{ title: regex }, { description: regex }];
    }

    // Fetch active listings
    const rawListings = await Listing.find(dbQuery)
      .populate('sellerId', 'name email role')
      .sort({ currentBid: 1, closingTime: 1 })
      .lean();

    // Map and compute intelligent proxy bidding recommendations
    const userStr = (userId || '').toString();

    const analyzedListings = await Promise.all(
      rawListings.map(async (item) => {
        const bidsCount = await Bid.countDocuments({ listingId: item._id });
        const nextMinBid =
          bidsCount === 0 ? item.startingPrice : item.currentBid + item.minIncrement;

        const isOwner = userStr && (item.sellerId?._id || item.sellerId).toString() === userStr;
        const withinBudget = nextMinBid <= parsed.maxBudget;

        return {
          _id: item._id,
          title: item.title,
          category: item.category,
          condition: item.condition,
          description: item.description,
          photos: item.photos || [],
          startingPrice: item.startingPrice,
          currentBid: item.currentBid,
          minIncrement: item.minIncrement,
          closingTime: item.closingTime,
          sellerName: item.sellerId?.name || 'Senior Student',
          bidsCount,
          nextMinBid,
          withinBudget,
          isOwner,
          canAutoBid: !isOwner && withinBudget,
        };
      })
    );

    // Filter down listings that fit within maximum budget threshold
    const budgetMatches = analyzedListings.filter((item) => item.withinBudget);

    // Generate natural language reasoning summary
    let summary = '';
    if (budgetMatches.length === 0) {
      summary = `I analyzed active campus auctions for "${prompt}", but found no active items under ₹${parsed.maxBudget.toLocaleString()}. You can try increasing your budget limit or setting up a Watchlist Alert.`;
    } else {
      const topPick = budgetMatches[0];
      summary = `I discovered ${budgetMatches.length} live campus auction${
        budgetMatches.length > 1 ? 's' : ''
      } matching your request. The top recommended item is "${topPick.title}" with a current bid of ₹${topPick.currentBid}. A next minimum bid of ₹${topPick.nextMinBid} is within your ₹${parsed.maxBudget.toLocaleString()} limit.`;
    }

    res.json({
      parsedCriteria: parsed,
      summary,
      totalMatches: budgetMatches.length,
      listings: budgetMatches,
      allFound: analyzedListings,
    });
  } catch (err) {
    console.error('Error in AI Finder:', err);
    res.status(500).json({ error: 'Failed to process AI search request', details: err.message });
  }
});

/**
 * 2. POST /api/ai/auto-bid
 * Execute an authorized Autonomous Proxy Bid up to student's specified ceiling
 * Enforces strict safety guards:
 * - Explicit user confirmation / authorization required
 * - Cannot exceed budget limit
 * - Cannot bid on own listing
 * - Respects auction minimum increments
 */
router.post('/ai/auto-bid', async (req, res) => {
  try {
    const { listingId, userId, maxBudget, authorized } = req.body;

    // Safety Guard 1: Explicit user consent
    if (!authorized) {
      return res.status(403).json({
        error: 'Safety Guard: Explicit user authorization is required before placing an automated proxy bid.',
      });
    }

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ error: 'Invalid listing ID provided.' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to execute an authorized proxy bid.' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Safety Guard 2: Auction must be active
    const isPastClosing = new Date() > new Date(listing.closingTime);
    if (listing.status !== 'active' || isPastClosing) {
      return res.status(400).json({
        error: 'Cannot place proxy bid: Auction is closed or expired.',
      });
    }

    // Safety Guard 3: User cannot bid on own listing
    const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
    if (sellerIdStr === userId.toString()) {
      return res.status(400).json({
        error: 'Safety Guard: Sellers cannot place automated bids on their own items.',
      });
    }

    // Safety Guard 4: Calculate valid next bid amount
    const existingBidsCount = await Bid.countDocuments({ listingId: listing._id });
    const minRequiredBid =
      existingBidsCount === 0
        ? listing.startingPrice
        : listing.currentBid + listing.minIncrement;

    const parsedMaxBudget = parseFloat(maxBudget);
    if (isNaN(parsedMaxBudget) || parsedMaxBudget <= 0) {
      return res.status(400).json({ error: 'Please provide a valid budget cap.' });
    }

    // Safety Guard 5: Cap check - Agent never exceeds student's agreed limit
    if (minRequiredBid > parsedMaxBudget) {
      return res.status(400).json({
        error: `Agent Safety Limit Exceeded: The next required bid of ₹${minRequiredBid} exceeds your agreed maximum budget of ₹${parsedMaxBudget}.`,
      });
    }

    // Fetch user details for bid entry
    const userDoc = await User.findById(userId);
    const bidderName = userDoc ? userDoc.name : 'AI Proxy Bidder';

    // Place the proxy bid at the minimum increment needed to lead
    const newBid = new Bid({
      listingId: listing._id,
      bidderId: userId,
      amount: minRequiredBid,
    });

    await newBid.save();

    // Update listing's currentBid
    listing.currentBid = minRequiredBid;
    await listing.save();

    // Populate for real-time emission
    const populatedBid = await Bid.findById(newBid._id).populate('bidderId', 'name email role');

    // Broadcast Socket.io event to room
    const io = req.app.get('io');
    if (io) {
      io.to(listing._id.toString()).emit('bidUpdate', {
        listingId: listing._id.toString(),
        currentBid: minRequiredBid,
        bid: populatedBid,
        isAutoBid: true,
      });
    }

    res.json({
      success: true,
      message: `Autonomous Proxy Bid of ₹${minRequiredBid} placed successfully on "${listing.title}". Your budget ceiling is set to ₹${parsedMaxBudget}.`,
      bid: populatedBid,
      placedAmount: minRequiredBid,
      maxBudget: parsedMaxBudget,
      remainingHeadroom: parsedMaxBudget - minRequiredBid,
      listing: {
        _id: listing._id,
        title: listing.title,
        currentBid: listing.currentBid,
      },
    });
  } catch (err) {
    console.error('Error executing auto-bid:', err);
    res.status(500).json({ error: 'Failed to execute autonomous bid', details: err.message });
  }
});

module.exports = router;
