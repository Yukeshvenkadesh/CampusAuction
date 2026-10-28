const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');
const Listing = require('../models/Listing');
const Bid = require('../models/Bid');
const Question = require('../models/Question');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');
const ProxyBid = require('../models/ProxyBid');

// Helper to safely resolve or create a valid Mongoose User ObjectId
async function resolveUser(userId, fallbackRole = 'buyer', fallbackName = 'Campus Student') {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const existing = await User.findById(userId);
    if (existing) return existing._id;
  }

  const defaultEmail =
    fallbackRole === 'seller' ? 'senior.seller@campus.edu' : 'student.bidder@campus.edu';

  let user = await User.findOne({ email: defaultEmail });
  if (!user) {
    user = await User.create({
      name: fallbackName,
      email: defaultEmail,
      role: fallbackRole,
    });
  }
  return user._id;
}

/**
 * 1. GET /api/listings
 * Fetch all active listings with query filters (keyword, category, condition, sort)
 */
router.get('/listings', async (req, res) => {
  try {
    const { keyword, search, category, condition, status, sort, sellerId } = req.query;

    const query = {};

    // Filter by sellerId if provided
    if (sellerId) {
      if (mongoose.Types.ObjectId.isValid(sellerId)) {
        query.sellerId = sellerId;
      }
    }

    // Filter by status (default active unless requested otherwise or viewing specific seller)
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status && !sellerId) {
      query.status = 'active';
    }

    // Search keyword across title and description
    const searchTerm = keyword || search;
    if (searchTerm && searchTerm.trim()) {
      const regex = new RegExp(searchTerm.trim(), 'i');
      query.$or = [{ title: regex }, { description: regex }];
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Condition filter
    if (condition && condition !== 'all') {
      query.condition = condition;
    }

    // Sorting
    let sortOptions = { closingTime: 1 }; // default: ending soonest
    if (sort === 'priceLow') {
      sortOptions = { currentBid: 1 };
    } else if (sort === 'priceHigh') {
      sortOptions = { currentBid: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const listings = await Listing.find(query)
      .populate('sellerId', 'name email role')
      .sort(sortOptions);

    res.json(listings);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to retrieve listings', details: err.message });
  }
});

/**
 * 2. POST /api/listings
 * Create a new listing with initial currentBid equal to startingPrice
 */
router.post('/listings', async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      condition,
      photos,
      startingPrice,
      minIncrement,
      closingTime,
      sellerId,
    } = req.body;

    if (!title || !category || !description || !condition || startingPrice === undefined || !closingTime) {
      return res.status(400).json({
        error: 'Missing required fields: title, category, description, condition, startingPrice, closingTime are required.',
      });
    }

    const parsedStartingPrice = Number(startingPrice);
    if (isNaN(parsedStartingPrice) || parsedStartingPrice < 0) {
      return res.status(400).json({ error: 'startingPrice must be a non-negative number.' });
    }

    const parsedMinIncrement = Number(minIncrement) || 10;
    const resolvedSellerId = await resolveUser(sellerId, 'seller', 'Senior Student Seller');

    const newListing = new Listing({
      title: title.trim(),
      category,
      description: description.trim(),
      condition,
      photos: Array.isArray(photos) ? photos : (photos ? [photos] : []),
      startingPrice: parsedStartingPrice,
      currentBid: parsedStartingPrice, // Automatically set currentBid equal to startingPrice
      minIncrement: parsedMinIncrement,
      closingTime: new Date(closingTime),
      status: 'active',
      sellerId: resolvedSellerId,
    });

    const savedListing = await newListing.save();
    const populated = await Listing.findById(savedListing._id).populate('sellerId', 'name email role');

    // Check matching user alerts in the Alert collection & generate notifications
    try {
      const activeAlerts = await Alert.find({
        active: { $ne: false },
        userId: { $ne: resolvedSellerId },
      });

      for (const alert of activeAlerts) {
        // 1. Category check
        const matchesCategory =
          !alert.category ||
          alert.category === 'all' ||
          alert.category.toLowerCase() === category.toLowerCase();

        // 2. Maximum price threshold check
        const matchesPrice =
          alert.maxPrice === undefined ||
          alert.maxPrice === null ||
          parsedStartingPrice <= alert.maxPrice;

        // 3. Keyword search across title and description
        let matchesKeyword = true;
        if (alert.keyword && alert.keyword.trim()) {
          const kw = alert.keyword.trim().toLowerCase();
          const inTitle = title.toLowerCase().includes(kw);
          const inDesc = description.toLowerCase().includes(kw);
          matchesKeyword = inTitle || inDesc;
        }

        if (matchesCategory && matchesPrice && matchesKeyword) {
          // Generate an unread notification record
          const notification = await Notification.create({
            userId: alert.userId,
            alertId: alert._id,
            listingId: savedListing._id,
            keyword: alert.keyword,
            title: `Item Matched: ${title}`,
            message: `A new "${category}" item matching your alert "${alert.keyword}" (Starting ₹${parsedStartingPrice}) was just listed!`,
            read: false,
          });

          // Also record match in alert document
          alert.notifications.push({
            listingId: savedListing._id,
            matchedPrice: parsedStartingPrice,
            read: false,
            createdAt: new Date(),
          });
          await alert.save();

          // Real-time broadcast if socket is connected
          const io = req.app.get('io');
          if (io) {
            io.emit('newAlertNotification', {
              userId: alert.userId.toString(),
              notification,
              listing: populated,
            });
          }
        }
      }
    } catch (alertErr) {
      console.error('Error checking alerts for new listing:', alertErr);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating listing:', err);
    res.status(500).json({ error: 'Failed to create listing', details: err.message });
  }
});

/**
 * 3. GET /api/listings/:id
 * Fetch a single listing by ID with associated bid history and questions
 */
router.get('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    const listing = await Listing.findById(id).populate('sellerId', 'name email role');
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Associated bid history (highest / latest first)
    const bids = await Bid.find({ listingId: id })
      .populate('bidderId', 'name email role')
      .sort({ amount: -1, createdAt: -1 });

    // Associated questions
    const questions = await Question.find({ listingId: id })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    // Check if an auto-bidder currently holds a proxy lead on this item
    let hasProxyLead = false;
    if (bids.length > 0) {
      const topBid = bids[0];
      const highestBidderId = topBid?.bidderId?._id || topBid?.bidderId;
      if (highestBidderId) {
        const leaderProxy = await ProxyBid.findOne({
          listingId: id,
          userId: highestBidderId,
          active: true,
          maxAmount: { $gt: listing.currentBid },
        });
        hasProxyLead = Boolean(leaderProxy || topBid.isProxy);
      }
    }

    // Check requesting user's own proxy bid if userId provided
    let userProxy = null;
    const reqUserId = req.query.userId || req.headers['x-user-id'];
    if (reqUserId && mongoose.Types.ObjectId.isValid(reqUserId)) {
      userProxy = await ProxyBid.findOne({ listingId: id, userId: reqUserId, active: true });
    }

    res.json({
      ...listing.toObject(),
      bids,
      questions,
      hasProxyLead,
      userProxy,
    });
  } catch (err) {
    console.error('Error fetching listing details:', err);
    res.status(500).json({ error: 'Failed to retrieve listing details', details: err.message });
  }
});

/**
 * PUT /api/listings/:id
 * Update listing details (title, description, starting price, closing time, etc.)
 * Strictly verifies that the requesting user is the owner (sellerId).
 */
router.put('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userId,
      title,
      category,
      description,
      condition,
      startingPrice,
      minIncrement,
      closingTime,
      photos,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Verify ownership: requesting user must match sellerId
    const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
    const effectiveUserId = (userId || req.query.userId || req.headers['x-user-id'] || '').toString();

    if (!effectiveUserId || sellerIdStr !== effectiveUserId) {
      return res.status(403).json({ error: 'Only the seller who created this listing can edit it.' });
    }

    // Prevent modifying closed or cancelled listings
    if (listing.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot edit a listing that has already been cancelled.' });
    }
    if (listing.status === 'sold') {
      return res.status(400).json({ error: 'Cannot edit a sold listing.' });
    }

    // Check if any bids have been placed
    const bidsCount = await Bid.countDocuments({ listingId: listing._id });

    // Validate startingPrice update
    if (startingPrice !== undefined) {
      const parsedStartingPrice = Number(startingPrice);
      if (isNaN(parsedStartingPrice) || parsedStartingPrice < 0) {
        return res.status(400).json({ error: 'Starting price must be a valid non-negative number.' });
      }

      if (bidsCount > 0 && parsedStartingPrice !== listing.startingPrice) {
        return res.status(400).json({
          error: 'Starting price cannot be changed because bids have already been placed on this auction.',
        });
      }

      if (bidsCount === 0) {
        listing.startingPrice = parsedStartingPrice;
        listing.currentBid = parsedStartingPrice;
      }
    }

    if (title && title.trim()) {
      listing.title = title.trim();
    }
    if (category) {
      listing.category = category;
    }
    if (description && description.trim()) {
      listing.description = description.trim();
    }
    if (condition) {
      listing.condition = condition;
    }
    if (minIncrement !== undefined) {
      const parsedInc = Number(minIncrement);
      if (!isNaN(parsedInc) && parsedInc > 0) {
        listing.minIncrement = parsedInc;
      }
    }
    if (closingTime) {
      const parsedTime = new Date(closingTime);
      if (!isNaN(parsedTime.getTime())) {
        listing.closingTime = parsedTime;
      }
    }
    if (Array.isArray(photos) && photos.length > 0) {
      listing.photos = photos;
    }

    const savedListing = await listing.save();
    const populated = await Listing.findById(savedListing._id).populate('sellerId', 'name email role');

    // Real-Time notification
    const io = req.app.get('io');
    if (io) {
      io.to(id.toString()).emit('listingUpdated', populated);
    }

    res.json({
      message: 'Listing updated successfully!',
      listing: populated,
    });
  } catch (err) {
    console.error('Error updating listing:', err);
    res.status(500).json({ error: 'Failed to update listing', details: err.message });
  }
});

/**
 * DELETE /api/listings/:id
 * Cancel or delete an active listing.
 * Strictly verifies that the requesting user is the owner (sellerId).
 */
router.delete('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const effectiveUserId = (
      req.body?.userId ||
      req.query?.userId ||
      req.headers['x-user-id'] ||
      ''
    ).toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Verify ownership
    const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
    if (!effectiveUserId || sellerIdStr !== effectiveUserId) {
      return res.status(403).json({ error: 'Only the seller who created this listing can cancel or delete it.' });
    }

    const isHardDelete = req.query.hardDelete === 'true';

    if (isHardDelete) {
      // Remove bids and questions associated with the listing
      await Bid.deleteMany({ listingId: listing._id });
      await Question.deleteMany({ listingId: listing._id });
      await Listing.findByIdAndDelete(id);
    } else {
      // Soft cancel listing: mark status as 'cancelled'
      listing.status = 'cancelled';
      await listing.save();
    }

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(id.toString()).emit('listingCancelled', {
        listingId: id.toString(),
        isHardDelete,
      });
    }

    res.json({
      message: isHardDelete ? 'Listing deleted permanently.' : 'Listing cancelled successfully.',
      listingId: id,
      status: isHardDelete ? 'deleted' : 'cancelled',
    });
  } catch (err) {
    console.error('Error cancelling/deleting listing:', err);
    res.status(500).json({ error: 'Failed to cancel listing', details: err.message });
  }
});


/**
 * -------------------------------------------------------------
 * AUTOMATIC PROXY BIDDING ENGINE
 * -------------------------------------------------------------
 */

/**
 * Whenever any bid is placed, this trigger checks if any other user has an active proxy bid
 * higher than currentBid + minIncrement. If found, it automatically places an incremental counter-bid
 * on their behalf, keeping them safely in the lead up to their specified cap.
 */
async function executeProxyBiddingTrigger(listing, io) {
  let safetyIterations = 0;
  const maxIterations = 20;

  while (safetyIterations < maxIterations) {
    safetyIterations++;

    // Refresh listing to get latest currentBid
    const currentListing = await Listing.findById(listing._id);
    if (!currentListing || currentListing.status !== 'active') break;

    // Get current leader
    const latestBid = await Bid.findOne({ listingId: listing._id })
      .sort({ amount: -1, createdAt: -1 });

    const leaderId = latestBid ? latestBid.bidderId.toString() : null;
    const currentAmount = currentListing.currentBid;
    const minIncrement = currentListing.minIncrement || 10;
    const nextRequiredBid = currentAmount + minIncrement;

    // Find any competing user with an active proxy bid who can afford the next required bid
    const competingProxy = await ProxyBid.findOne({
      listingId: listing._id,
      active: true,
      userId: { $ne: leaderId },
      maxAmount: { $gte: nextRequiredBid },
    }).sort({ maxAmount: -1, createdAt: 1 });

    if (!competingProxy) {
      // No competitor has an active proxy capable of outbidding
      break;
    }

    // Place automated counter-bid
    const autoBidAmount = nextRequiredBid;
    const autoBid = new Bid({
      listingId: listing._id,
      bidderId: competingProxy.userId,
      amount: autoBidAmount,
      isProxy: true,
    });
    await autoBid.save();

    currentListing.currentBid = autoBidAmount;
    await currentListing.save();

    const populatedAutoBid = await Bid.findById(autoBid._id).populate('bidderId', 'name email role');

    if (io) {
      io.to(listing._id.toString()).emit('bidUpdate', {
        listingId: listing._id.toString(),
        currentBid: currentListing.currentBid,
        minIncrement: currentListing.minIncrement,
        nextMinBid: currentListing.currentBid + currentListing.minIncrement,
        bid: populatedAutoBid,
        isAutoBid: true,
        hasProxyLead: true,
      });
      console.log(`🤖 [Proxy Engine] Auto counter-bid ₹${autoBidAmount} placed for user ${competingProxy.userId}`);
    }
  }
}

/**
 * 4. POST /api/listings/:id/bid & /api/listings/:id/bids
 * Place a new bid or register an automatic proxy bidding ceiling
 */
const handlePlaceBid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, maxAmount, bidderId, bidderName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // 1. Ensure auction is not closed or cancelled
    const isPastClosing = new Date() > new Date(listing.closingTime);
    if (listing.status !== 'active' || isPastClosing) {
      return res.status(400).json({
        error: 'Bidding is closed for this item. Auction has expired or status is not active.',
      });
    }

    // Resolve bidder
    const resolvedBidderId = await resolveUser(bidderId, 'buyer', bidderName || 'Campus Bidder');

    // Prevent sellers from bidding on their own listings
    const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
    if (sellerIdStr === resolvedBidderId.toString()) {
      return res.status(400).json({ error: 'Sellers cannot place bids on their own items.' });
    }

    // Calculate minimum required bid
    const existingBidsCount = await Bid.countDocuments({ listingId: listing._id });
    const minRequiredAmount =
      existingBidsCount === 0 ? listing.startingPrice : listing.currentBid + listing.minIncrement;

    // Check if user is already the current leader
    const currentLeaderBid = await Bid.findOne({ listingId: listing._id }).sort({ amount: -1, createdAt: -1 });
    const isAlreadyLeader = currentLeaderBid && currentLeaderBid.bidderId.toString() === resolvedBidderId.toString();

    // Check if user is setting or updating an automated proxy bid
    const numMaxAmount =
      maxAmount !== undefined && maxAmount !== null && maxAmount !== ''
        ? Number(maxAmount)
        : null;

    if (numMaxAmount !== null) {
      if (isNaN(numMaxAmount) || numMaxAmount < minRequiredAmount) {
        return res.status(400).json({
          error: `Auto-bid maximum budget must be at least the next required bid (₹${minRequiredAmount}).`,
        });
      }

      // Save/update ProxyBid
      await ProxyBid.findOneAndUpdate(
        { listingId: listing._id, userId: resolvedBidderId },
        { maxAmount: numMaxAmount, active: true },
        { upsert: true, new: true }
      );

      // If user is already leading the auction, just update their ceiling without forcing self-outbid
      if (isAlreadyLeader) {
        return res.status(200).json({
          message: `Auto-bid maximum limit updated to ₹${numMaxAmount}! You are currently leading the auction.`,
          currentBid: listing.currentBid,
          maxAmount: numMaxAmount,
          isLeader: true,
          hasProxyLead: true,
        });
      }
    }

    // Determine initial bid amount
    let numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      if (numMaxAmount !== null) {
        numAmount = minRequiredAmount; // Default to minimum required when setting auto-bid
      } else {
        return res.status(400).json({ error: 'Please provide a valid positive bid amount.' });
      }
    }

    if (numAmount < minRequiredAmount) {
      return res.status(400).json({
        error: `Bid amount ₹${numAmount} is too low. Minimum required bid is ₹${minRequiredAmount} (Starting: ₹${listing.startingPrice}, Current: ₹${listing.currentBid}, Min increment: +₹${listing.minIncrement}).`,
      });
    }

    if (numMaxAmount !== null && numAmount > numMaxAmount) {
      return res.status(400).json({
        error: `Initial bid amount ₹${numAmount} cannot exceed your maximum budget cap of ₹${numMaxAmount}.`,
      });
    }

    // 3. Save new Bid
    const newBid = new Bid({
      listingId: listing._id,
      bidderId: resolvedBidderId,
      amount: numAmount,
      isProxy: Boolean(numMaxAmount !== null),
    });
    const savedBid = await newBid.save();

    // 4. Update currentBid on the Listing
    listing.currentBid = numAmount;
    await listing.save();

    const populatedBid = await Bid.findById(savedBid._id).populate('bidderId', 'name email role');

    // Emit real-time WebSocket event for initial bid
    const io = req.app.get('io');
    if (io) {
      io.to(listing._id.toString()).emit('bidUpdate', {
        listingId: listing._id.toString(),
        currentBid: listing.currentBid,
        minIncrement: listing.minIncrement,
        nextMinBid: listing.currentBid + listing.minIncrement,
        bid: populatedBid,
        hasProxyLead: Boolean(numMaxAmount !== null),
      });
    }

    // 5. Automated Background Trigger: Check competing proxy bids and counter-bid automatically
    await executeProxyBiddingTrigger(listing, io);

    // Re-fetch listing to return updated state after any proxy resolution
    const finalListing = await Listing.findById(listing._id);
    const finalLeaderBid = await Bid.findOne({ listingId: listing._id })
      .populate('bidderId', 'name email role')
      .sort({ amount: -1, createdAt: -1 });

    const finalLeaderId = finalLeaderBid?.bidderId?._id || finalLeaderBid?.bidderId;
    const activeLeaderProxy = finalLeaderId
      ? await ProxyBid.findOne({ listingId: listing._id, userId: finalLeaderId, active: true })
      : null;

    res.status(201).json({
      message:
        numMaxAmount !== null
          ? 'Auto-bid ceiling registered and proxy bid placed!'
          : 'Bid placed successfully!',
      bid: finalLeaderBid || populatedBid,
      currentBid: finalListing.currentBid,
      hasProxyLead: Boolean(activeLeaderProxy || finalLeaderBid?.isProxy),
    });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ error: 'Failed to place bid', details: err.message });
  }
};

router.post('/listings/:id/bid', handlePlaceBid);
router.post('/listings/:id/bids', handlePlaceBid);

/**
 * Dedicated Proxy Bid Route: POST /api/listings/:id/proxy-bid
 */
router.post('/listings/:id/proxy-bid', async (req, res) => {
  req.body.maxAmount = req.body.maxAmount || req.body.maxBudget;
  req.body.bidderId = req.body.bidderId || req.body.userId;
  req.body.bidderName = req.body.bidderName || req.body.userName;
  return handlePlaceBid(req, res);
});

/**
 * GET /api/listings/:id/proxy-bid/:userId
 * Check if the user has an active proxy bid ceiling on this listing
 */
router.get('/listings/:id/proxy-bid/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const proxy = await ProxyBid.findOne({ listingId: id, userId, active: true });
    res.json({ proxyBid: proxy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proxy bid status' });
  }
});

/**
 * 5. POST /api/listings/:id/questions
 * Post a new question on an item, or allow seller to answer an existing question
 */
router.post('/listings/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { questionId, question, answer, userId, userName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Case A: Answering an existing question
    if (questionId) {
      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID format.' });
      }

      // Verify that the user is the seller of this listing
      const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
      if (!userId || sellerIdStr !== userId.toString()) {
        return res.status(403).json({
          error: 'Only the seller can answer questions for this listing.',
        });
      }

      const existingQuestion = await Question.findOne({ _id: questionId, listingId: id });
      if (!existingQuestion) {
        return res.status(404).json({ error: 'Question not found on this listing.' });
      }

      existingQuestion.answer = (answer || '').trim();
      const updated = await existingQuestion.save();
      const populated = await Question.findById(updated._id).populate('userId', 'name email');

      // Emit real-time Socket.io event
      const io = req.app.get('io');
      if (io) {
        io.to(id.toString()).emit('questionAnswered', {
          listingId: id.toString(),
          question: populated,
        });
      }

      return res.json({ message: 'Answer updated successfully', question: populated });
    }

    // Case B: Posting a new question
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question text is required.' });
    }

    const resolvedUserId = await resolveUser(userId, 'buyer', userName || 'Campus Student');

    const newQuestion = new Question({
      listingId: listing._id,
      userId: resolvedUserId,
      question: question.trim(),
      answer: answer ? answer.trim() : '',
    });

    const saved = await newQuestion.save();
    const populated = await Question.findById(saved._id).populate('userId', 'name email');

    // Emit real-time Socket.io event for new question
    const io = req.app.get('io');
    if (io) {
      io.to(id.toString()).emit('questionPosted', {
        listingId: id.toString(),
        question: populated,
      });
    }

    res.status(201).json({
      message: 'Question posted successfully!',
      question: populated,
    });
  } catch (err) {
    console.error('Error with question endpoint:', err);
    res.status(500).json({ error: 'Failed to handle question', details: err.message });
  }
});

/**
 * Dedicated Endpoint: POST /api/listings/:id/questions/:questionId/answer
 * Allows seller to answer a question with sellerId verification
 */
router.post('/listings/:id/questions/:questionId/answer', async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const { answer, userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer cannot be empty.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Verify that the user making the request is the owner (sellerId) of the listing
    const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
    if (!userId || sellerIdStr !== userId.toString()) {
      return res.status(403).json({
        error: 'Only the seller can answer questions for this listing.',
      });
    }

    const questionDoc = await Question.findOne({ _id: questionId, listingId: id });
    if (!questionDoc) {
      return res.status(404).json({ error: 'Question not found on this listing.' });
    }

    questionDoc.answer = answer.trim();
    const saved = await questionDoc.save();
    const populated = await Question.findById(saved._id).populate('userId', 'name email');

    // Emit real-time Socket.io event
    const io = req.app.get('io');
    if (io) {
      io.to(id.toString()).emit('questionAnswered', {
        listingId: id.toString(),
        question: populated,
      });
    }

    res.json({
      message: 'Answer submitted successfully!',
      question: populated,
    });
  } catch (err) {
    console.error('Error answering question:', err);
    res.status(500).json({ error: 'Failed to submit answer', details: err.message });
  }
});

/**
 * GET /api/listings/:id/questions
 */
router.get('/listings/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const questions = await Question.find({ listingId: id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get questions', details: err.message });
  }
});

/**
 * GET /api/listings/:id/bids
 */
router.get('/listings/:id/bids', async (req, res) => {
  try {
    const { id } = req.params;
    const bids = await Bid.find({ listingId: id })
      .populate('bidderId', 'name email')
      .sort({ amount: -1, createdAt: -1 });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bids', details: err.message });
  }
});

/**
 * 1. POST /api/users/register & /api/auth/register
 * Explicit registration route with bcrypt password hashing
 */
router.post(['/users/register', '/auth/register'], async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role === 'seller' ? 'seller' : 'buyer',
    });

    const savedUser = await newUser.save();
    const userObj = savedUser.toObject();
    delete userObj.password;

    res.status(201).json(userObj);
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

/**
 * 2. POST /api/users/login & /api/auth/login
 * Explicit login route with bcrypt password verification
 */
router.post(['/users/login', '/auth/login'], async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // If user has a hashed password stored, verify with bcrypt
    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    } else {
      // Legacy user without password: set and hash the password for future logins
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json(userObj);
  } catch (err) {
    console.error('Error logging in user:', err);
    res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
});

/**
 * GET /api/users/:userId/listings
 * Fetch all listings created by a specific user
 */
router.get('/users/:userId/listings', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const listings = await Listing.find({ sellerId: userId }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    console.error('Error fetching user listings:', err);
    res.status(500).json({ error: 'Failed to fetch user listings', details: err.message });
  }
});

/**
 * GET /api/users/:userId/bids
 * Fetch all bids placed by a specific user with populated listing information
 */
router.get('/users/:userId/bids', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const bids = await Bid.find({ bidderId: userId })
      .populate({
        path: 'listingId',
        select: 'title category currentBid startingPrice status closingTime photos minIncrement',
        populate: { path: 'sellerId', select: 'name email' },
      })
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (err) {
    console.error('Error fetching user bids:', err);
    res.status(500).json({ error: 'Failed to fetch user bids', details: err.message });
  }
});

/**
 * -------------------------------------------------------------
 * ALERTS & WATCHLIST ENDPOINTS
 * -------------------------------------------------------------
 */

/**
 * POST /api/alerts
 * Create a new search alert for items and price thresholds
 */
router.post('/alerts', async (req, res) => {
  try {
    const { userId, keyword, maxPrice, category } = req.body;

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ error: 'Keyword is required for setting an alert.' });
    }

    const resolvedUserId = await resolveUser(userId, 'buyer', 'Campus Student');
    const parsedPrice =
      maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : 999999;

    const newAlert = new Alert({
      userId: resolvedUserId,
      keyword: keyword.trim(),
      maxPrice: isNaN(parsedPrice) || parsedPrice <= 0 ? 999999 : parsedPrice,
      category: category && category !== 'all' ? category : 'all',
      active: true,
      notifications: [],
    });

    const saved = await newAlert.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({ error: 'Failed to create alert', details: err.message });
  }
});

/**
 * GET /api/alerts/:userId
 * Fetch user's active search alerts and any triggered notifications
 */
router.get('/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const alerts = await Alert.find({ userId })
      .populate('notifications.listingId', 'title category currentBid startingPrice photos status closingTime')
      .sort({ createdAt: -1 });

    const notifications = await Notification.find({ userId })
      .populate('listingId', 'title category currentBid startingPrice photos status closingTime')
      .sort({ createdAt: -1 });

    res.json({
      alerts,
      notifications,
    });
  } catch (err) {
    console.error('Error fetching user alerts:', err);
    res.status(500).json({ error: 'Failed to retrieve alerts', details: err.message });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete or unsubscribe from an alert
 */
router.delete('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert ID format' });
    }

    await Alert.findByIdAndDelete(id);
    await Notification.deleteMany({ alertId: id });

    res.json({ message: 'Alert removed successfully', alertId: id });
  } catch (err) {
    console.error('Error deleting alert:', err);
    res.status(500).json({ error: 'Failed to delete alert', details: err.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid notification ID format' });
    }

    const updated = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read', details: err.message });
  }
});

/**
 * PUT /api/notifications/read-all/:userId
 * Mark all notifications for a user as read
 */
router.put('/notifications/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read', details: err.message });
  }
});

module.exports = router;
