const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');
const Listing = require('../models/Listing');
const Bid = require('../models/Bid');
const Question = require('../models/Question');

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

    res.json({
      ...listing.toObject(),
      bids,
      questions,
    });
  } catch (err) {
    console.error('Error fetching listing details:', err);
    res.status(500).json({ error: 'Failed to retrieve listing details', details: err.message });
  }
});

/**
 * 4. POST /api/listings/:id/bid & /api/listings/:id/bids
 * Place a new bid on a listing with validation
 */
const handlePlaceBid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, bidderId, bidderName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // 1. Ensure auction is not closed
    const isPastClosing = new Date() > new Date(listing.closingTime);
    if (listing.status !== 'active' || isPastClosing) {
      return res.status(400).json({
        error: 'Bidding is closed for this item. Auction has expired or status is not active.',
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please provide a valid positive bid amount.' });
    }

    // 2. Validate bid amount against startingPrice or currentBid + minIncrement
    const existingBidsCount = await Bid.countDocuments({ listingId: listing._id });

    let minRequiredAmount;
    if (existingBidsCount === 0) {
      // First bid must be at least the starting price
      minRequiredAmount = listing.startingPrice;
    } else {
      // Subsequent bids must exceed current bid by at least minIncrement
      minRequiredAmount = listing.currentBid + listing.minIncrement;
    }

    if (numAmount < minRequiredAmount) {
      return res.status(400).json({
        error: `Bid amount ₹${numAmount} is too low. Minimum required bid is ₹${minRequiredAmount} (Starting: ₹${listing.startingPrice}, Current: ₹${listing.currentBid}, Min increment: +₹${listing.minIncrement}).`,
      });
    }

    // Resolve bidder to valid ObjectId
    const resolvedBidderId = await resolveUser(bidderId, 'buyer', bidderName || 'Campus Bidder');

    // Prevent sellers from bidding on their own listings
    const sellerIdStr = (listing.sellerId?._id || listing.sellerId).toString();
    if (sellerIdStr === resolvedBidderId.toString()) {
      return res.status(400).json({ error: 'Sellers cannot place bids on their own items.' });
    }

    // 3. Save new Bid
    const newBid = new Bid({
      listingId: listing._id,
      bidderId: resolvedBidderId,
      amount: numAmount,
    });
    const savedBid = await newBid.save();

    // 4. Update currentBid on the Listing
    listing.currentBid = numAmount;
    await listing.save();

    const populatedBid = await Bid.findById(savedBid._id).populate('bidderId', 'name email');

    // Emit real-time WebSocket event to all clients viewing this listing
    const io = req.app.get('io');
    if (io) {
      io.to(listing._id.toString()).emit('bidUpdate', {
        listingId: listing._id.toString(),
        currentBid: listing.currentBid,
        minIncrement: listing.minIncrement,
        nextMinBid: listing.currentBid + listing.minIncrement,
        bid: populatedBid,
      });
      console.log(`📢 Emitted bidUpdate event to listing room: ${listing._id}`);
    }

    res.status(201).json({
      message: 'Bid placed successfully!',
      bid: populatedBid,
      currentBid: listing.currentBid,
    });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ error: 'Failed to place bid', details: err.message });
  }
};

router.post('/listings/:id/bid', handlePlaceBid);
router.post('/listings/:id/bids', handlePlaceBid);

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

      const existingQuestion = await Question.findOne({ _id: questionId, listingId: id });
      if (!existingQuestion) {
        return res.status(404).json({ error: 'Question not found on this listing.' });
      }

      existingQuestion.answer = (answer || '').trim();
      const updated = await existingQuestion.save();
      const populated = await Question.findById(updated._id).populate('userId', 'name email');
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

module.exports = router;
