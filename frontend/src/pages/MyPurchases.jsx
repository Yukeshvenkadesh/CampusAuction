import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowUpRight, Clock, Trophy, RefreshCw, ShoppingBag, AlertCircle } from 'lucide-react';
import { getUserBids } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function MyPurchases() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBids = async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserBids(user._id);
      setBids(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching user bids:', err);
      setError('Unable to fetch your bids from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, [user?._id]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <History className="w-3.5 h-3.5" />
            Buyer Dashboard
          </div>
          <h1 className="text-3xl font-black text-gray-900">My Bids & Purchases</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Monitor all campus auctions you have bid on and see if you are winning.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Loading your bid history from the database...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-white border border-red-200 text-center">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={fetchBids}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : bids.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">You haven't placed any bids yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Explore the campus marketplace to find pre-loved cycles, calculators, books, and electronics.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"
            >
              <span>Browse Active Auctions</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Your Bid</th>
                    <th className="py-4 px-6">Current Highest</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bids.map((b) => {
                    const listing = b.listingId;
                    if (!listing) return null;

                    const photo =
                      listing.photos && listing.photos.length > 0 ? listing.photos[0] : '';
                    const isWinning = b.amount >= (listing.currentBid || listing.startingPrice);
                    const isClosed = new Date(listing.closingTime) < new Date();

                    return (
                      <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                              <img
                                src={formatPhotoUrl(photo)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 block line-clamp-1">
                                {listing.title}
                              </span>
                              <span className="text-[11px] text-gray-400 capitalize">
                                {listing.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-extrabold text-indigo-600 text-sm">
                          ₹{b.amount}
                        </td>

                        <td className="py-4 px-6 font-bold text-gray-800 text-sm">
                          ₹{listing.currentBid || listing.startingPrice}
                        </td>

                        <td className="py-4 px-6">
                          {isWinning ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <Trophy className="w-3 h-3 text-emerald-500" />
                              {isClosed ? 'Won Auction!' : 'Highest Bidder'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              Outbid
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Link
                            to={`/listing/${listing._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
