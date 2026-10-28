import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  Tag,
  ArrowLeft,
  Gavel,
  History,
  HelpCircle,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  Share2,
  Calendar,
  Zap,
  LogIn,
} from 'lucide-react';
import { getListingById, placeBid, askQuestion } from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Bidding form states
  const [bidAmount, setBidAmount] = useState('');
  const [bidStatus, setBidStatus] = useState({ type: null, message: '' });
  const [submittingBid, setSubmittingBid] = useState(false);

  // Real-time toast & connection state
  const [liveNotification, setLiveNotification] = useState('');
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  // Q&A states
  const [newQuestion, setNewQuestion] = useState('');
  const [questionStatus, setQuestionStatus] = useState({ type: null, message: '' });
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getListingById(id);
        if (data && data._id) {
          setListing(data);
        } else {
          setError('Listing not found in database.');
        }
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError('Listing not found or unable to load details from database.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // Real-Time Socket.io Connection & Room Listener
  useEffect(() => {
    if (!id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinListing', id);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const handleBidUpdate = (data) => {
      console.log('⚡ [Socket] Received bidUpdate:', data);
      if (data.listingId === id) {
        setListing((prev) => {
          if (!prev) return prev;
          const newBid = data.bid;
          const currentBids = prev.bids || [];
          const exists = currentBids.some((b) => b._id === newBid?._id);
          const updatedBids = exists ? currentBids : [newBid, ...currentBids];
          return {
            ...prev,
            currentBid: data.currentBid,
            bids: updatedBids,
          };
        });

        const bidder = data.bid?.bidderId?.name || 'A bidder';
        setLiveNotification(`⚡ Live: ${bidder} placed a new highest bid of ₹${data.currentBid}!`);
        setTimeout(() => setLiveNotification(''), 4500);
      }
    };

    socket.on('bidUpdate', handleBidUpdate);

    return () => {
      socket.emit('leaveListing', id);
      socket.off('bidUpdate', handleBidUpdate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [id]);

  useEffect(() => {
    if (!listing?.closingTime) return;

    const calculateTimer = () => {
      const difference = new Date(listing.closingTime) - new Date();
      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Auction Expired');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [listing?.closingTime]);

  const currentBid = listing?.currentBid || listing?.startingPrice || 0;
  const minIncrement = listing?.minIncrement || 10;
  const minRequiredBid = currentBid + minIncrement;

  useEffect(() => {
    if (listing) {
      setBidAmount(minRequiredBid.toString());
    }
  }, [listing?.currentBid, minRequiredBid]);

  const sellerId = (listing?.sellerId?._id || listing?.sellerId || '').toString();
  const currentUserId = (user?._id || '').toString();
  const isSeller = Boolean(currentUserId && sellerId && currentUserId === sellerId);

  const handlePlaceBid = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (isSeller) {
      setBidStatus({
        type: 'error',
        message: 'Sellers cannot place bids on their own items.',
      });
      return;
    }

    const numAmount = parseFloat(bidAmount);

    if (isNaN(numAmount) || numAmount < minRequiredBid) {
      setBidStatus({
        type: 'error',
        message: `Your bid must be at least ₹${minRequiredBid} (minimum increment of ₹${minIncrement}).`,
      });
      return;
    }

    setSubmittingBid(true);
    setBidStatus({ type: null, message: '' });

    try {
      const response = await placeBid(listing._id, {
        bidderId: user._id,
        bidderName: user.name,
        amount: numAmount,
      });

      const newBidEntry = response.bid || {
        _id: 'bid-' + Date.now(),
        amount: numAmount,
        createdAt: new Date().toISOString(),
        bidderId: { name: user.name, email: user.email },
      };

      setListing((prev) => ({
        ...prev,
        currentBid: numAmount,
        bids: [newBidEntry, ...(prev.bids || [])],
      }));

      setBidStatus({
        type: 'success',
        message: `Success! You are now the highest bidder at ₹${numAmount}.`,
      });
      setBidAmount((numAmount + minIncrement).toString());
    } catch (err) {
      setBidStatus({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to place bid',
      });
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setSubmittingQuestion(true);
    setQuestionStatus({ type: null, message: '' });

    try {
      const res = await askQuestion(listing._id, {
        userId: user._id,
        userName: user.name,
        question: newQuestion,
      });

      const newQ = res.question || {
        _id: 'q-' + Date.now(),
        question: newQuestion,
        answer: '',
      };

      setListing((prev) => ({
        ...prev,
        questions: [...(prev.questions || []), newQ],
      }));

      setQuestionStatus({
        type: 'success',
        message: 'Your question was posted! The seller will be notified.',
      });
      setNewQuestion('');
    } catch (err) {
      setQuestionStatus({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to submit question.',
      });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500 text-sm font-medium">Loading live listing details from database...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <p className="text-xl font-bold text-gray-800">{error || 'Listing not found in database.'}</p>
        <p className="text-xs text-gray-500 mt-2">The requested auction might have ended or been removed.</p>
        <Link
          to="/"
          className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
        >
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const rawPhotos = listing.photos && listing.photos.length > 0 ? listing.photos : [''];
  const formattedPhotos = rawPhotos.map((p) => formatPhotoUrl(p));

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top bar with Back Link & Real-Time Badge */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all campus listings
          </Link>

          {/* WebSocket Status Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Auction Room Connected</span>
          </div>
        </div>

        {/* Live Event Flash Toast */}
        {liveNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-200 flex items-center gap-2.5 animate-bounce">
            <Zap className="w-4 h-4 text-yellow-200 shrink-0" />
            <span>{liveNotification}</span>
          </div>
        )}

        {/* Main Grid: Gallery & Bidding */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Gallery & Description (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gallery */}
            <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm overflow-hidden">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={formattedPhotos[selectedPhotoIndex] || formattedPhotos[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {listing.category}
                </span>
              </div>

              {/* Thumbnails */}
              {formattedPhotos.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                  {formattedPhotos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        selectedPhotoIndex === index
                          ? 'border-indigo-600 scale-95 shadow-md'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Item Details</h2>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {listing.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Condition</span>
                  <span className="text-sm font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    {listing.condition}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Starting Price</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                    ₹{listing.startingPrice}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Min Increment</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                    +₹{listing.minIncrement}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions & Answers Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">Questions & Answers</h2>
                </div>
                <span className="text-xs text-gray-400 font-semibold">
                  {(listing.questions || []).length} asked
                </span>
              </div>

              {/* Ask Question Form */}
              <form onSubmit={handleAskQuestion} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask seller about warranty, hostel pickup, accessories..."
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingQuestion || !newQuestion.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask</span>
                  </button>
                </div>
                {questionStatus.message && (
                  <p
                    className={`text-xs mt-2 font-medium ${
                      questionStatus.type === 'error' ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {questionStatus.message}
                  </p>
                )}
              </form>

              {/* Q&A List */}
              <div className="space-y-4">
                {(listing.questions || []).length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">
                    No questions yet. Be the first to ask!
                  </p>
                ) : (
                  listing.questions.map((q, idx) => (
                    <div key={q._id || idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-indigo-600 shrink-0">Q:</span>
                        <p className="text-xs font-semibold text-gray-800">{q.question}</p>
                      </div>
                      {q.answer ? (
                        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200/60 pl-2">
                          <span className="text-xs font-bold text-emerald-600 shrink-0">A:</span>
                          <p className="text-xs text-gray-600">{q.answer}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-1 italic pl-5">
                          Awaiting seller response...
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bidding Panel & Bid History (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Bid Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md sticky top-24">
              <h1 className="text-2xl font-extrabold text-gray-900 leading-snug">
                {listing.title}
              </h1>

              {/* Countdown Bar */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-indigo-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold block">
                    Time Remaining
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span className="text-lg font-black tracking-wide font-mono">
                      {timeLeft}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold block">
                    Status
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 capitalize">
                    {isExpired ? 'Closed' : listing.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="mt-6 flex items-baseline justify-between border-b border-gray-100 pb-5">
                <div>
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">
                    Highest Current Bid
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-indigo-600 transition-all duration-300">
                      ₹{currentBid}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Zap className="w-3 h-3 text-emerald-500" />
                      Live
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">
                    Min Next Bid
                  </span>
                  <span className="text-xl font-bold text-gray-800">
                    ₹{minRequiredBid}
                  </span>
                </div>
              </div>

              {/* Seller Notification Box or Buyer Bid Form */}
              {isSeller ? (
                <div className="mt-6 p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 shadow-sm animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">Your Product Listing</h4>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        This is your listing. You cannot bid on your own item.
                      </p>
                      <p className="text-[11px] text-amber-700 mt-2 font-medium">
                        Student bids from across campus will appear in the Live Bid History below in real-time.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="mt-6 space-y-4">
                  {isAuthenticated ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Bidding as:</span>
                      <span className="font-bold text-indigo-700">{user.name}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>Please sign in to place a verified bid.</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      Bid Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-sm font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={minRequiredBid}
                        step={minIncrement}
                        required
                        disabled={isExpired}
                        className="w-full pl-8 pr-4 py-3 text-lg font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Minimum allowed bid is ₹{minRequiredBid} (+₹{minIncrement} increment).
                    </p>
                  </div>

                  {bidStatus.message && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                        bidStatus.type === 'error'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {bidStatus.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{bidStatus.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingBid || isExpired}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>
                      {isExpired
                        ? 'Auction Ended'
                        : !isAuthenticated
                        ? 'Sign In to Bid'
                        : 'Place Live Bid'}
                    </span>
                  </button>
                </form>
              )}

              {/* Public Bid History */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Live Bid History
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold">
                    {(listing.bids || []).length} bids placed
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {(listing.bids || []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No bids placed yet. Start the auction!
                    </p>
                  ) : (
                    listing.bids.map((b, idx) => (
                      <div
                        key={b._id || idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                          idx === 0
                            ? 'bg-indigo-50 border border-indigo-200 font-semibold'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700">
                            {b.bidderId?.name || 'Campus Bidder'}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-bold">
                              Leader
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-indigo-600">₹{b.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
