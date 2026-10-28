import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import ListingCard from '../components/ListingCard';
import { getListings } from '../services/api';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [sortBy, setSortBy] = useState('closingSoon');

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'cycle', label: 'Cycles' },
    { id: 'calculator', label: 'Calculators' },
    { id: 'books', label: 'Books & Notes' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'other', label: 'Other' },
  ];

  const conditions = [
    { id: 'all', label: 'All Conditions' },
    { id: 'New', label: 'Brand New' },
    { id: 'Like New', label: 'Like New' },
    { id: 'Good', label: 'Good' },
    { id: 'Fair', label: 'Fair' },
  ];

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Exclusively fetch from MongoDB database
      const data = await getListings({ status: 'active' });
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch database listings:', err);
      setError(
        'Unable to connect to the database. Please ensure your backend server is running.'
      );
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        const matchesSearch =
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || item.category === selectedCategory;
        const matchesCondition =
          selectedCondition === 'all' || item.condition === selectedCondition;
        return matchesSearch && matchesCategory && matchesCondition;
      })
      .sort((a, b) => {
        if (sortBy === 'closingSoon') {
          return new Date(a.closingTime) - new Date(b.closingTime);
        }
        if (sortBy === 'priceLow') {
          const priceA = a.currentBid || a.startingPrice;
          const priceB = b.currentBid || b.startingPrice;
          return priceA - priceB;
        }
        if (sortBy === 'priceHigh') {
          const priceA = a.currentBid || a.startingPrice;
          const priceB = b.currentBid || b.startingPrice;
          return priceB - priceA;
        }
        return 0;
      });
  }, [listings, searchQuery, selectedCategory, selectedCondition, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-950 text-white py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Verified Campus Bidding Platform
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Buy & Sell Pre-loved Campus Gear
          </h1>
          <p className="mt-3 text-base sm:text-lg text-indigo-200 max-w-2xl mx-auto font-normal">
            Fair auctions for cycles, engineering calculators, textbooks, and hostel essentials before graduation.
          </p>

          {/* Search bar inside Hero */}
          <div className="mt-8 max-w-2xl mx-auto relative">
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-white">
              <Search className="w-5 h-5 text-gray-400 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cycles, fx-991EX, algorithm books, lab gear..."
                className="w-full py-4 px-3 text-gray-900 placeholder-gray-400 focus:outline-none text-sm sm:text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 bg-gray-100 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Controls Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 p-4 sm:p-6 mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-gray-100 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Condition Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-500 font-medium">Condition:</span>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
                >
                  {conditions.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchItems}
                className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5"
                title="Refresh database items"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="closingSoon">Ending Soonest</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Loading live campus auctions from database...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-red-200 p-8 shadow-sm">
            <p className="text-base font-bold text-red-600">{error}</p>
            <button
              onClick={fetchItems}
              className="mt-4 px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              Retry Database Connection
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          /* Empty State when 0 listings exist */
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              No active campus auctions right now.
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Be the first to sell something! List your cycles, calculators, books, or hostel gear to fellow students.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Sell a Product Now</span>
              </Link>
              {(searchQuery || selectedCategory !== 'all' || selectedCondition !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedCondition('all');
                  }}
                  className="px-4 py-3 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
