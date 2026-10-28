import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, PlusCircle, ArrowUpRight, Clock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { getUserListings } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserListings = async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserListings(user._id);
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching user listings:', err);
      setError('Unable to load your listings from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserListings();
  }, [user?._id]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
              <Package className="w-3.5 h-3.5" />
              Seller Dashboard
            </div>
            <h1 className="text-3xl font-black text-gray-900">My Product Listings</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Track active bids, view sales, and manage items you've put up for auction.
            </p>
          </div>

          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List Another Product</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Fetching your products from the database...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-white border border-red-200 text-center">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={fetchUserListings}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">You haven't listed any items yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Got cycles, calculators, course books, or hostel furniture? Put them up for auction to fellow students.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Listing</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => {
              const photo = item.photos && item.photos.length > 0 ? item.photos[0] : '';
              const isExpired = new Date(item.closingTime) < new Date();

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                      <img
                        src={formatPhotoUrl(photo)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm capitalize">
                        {item.category}
                      </span>
                      <span
                        className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full text-white ${
                          isExpired || item.status !== 'active' ? 'bg-red-500' : 'bg-emerald-600'
                        }`}
                      >
                        {isExpired ? 'Closed' : item.status}
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>

                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block font-medium">Starting</span>
                          <span className="font-bold text-gray-700">₹{item.startingPrice}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-medium">Current Bid</span>
                          <span className="font-extrabold text-indigo-600">
                            ₹{item.currentBid || item.startingPrice}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <Link
                      to={`/listing/${item._id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 hover:bg-indigo-50 text-indigo-700 font-bold text-xs transition-colors border border-gray-200 hover:border-indigo-200"
                    >
                      <span>View Live Auction</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
