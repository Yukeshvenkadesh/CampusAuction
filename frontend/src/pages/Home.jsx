import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import ListingCard from '../components/ListingCard';
import { getListings } from '../services/api';
import { sampleListings } from '../data/mockData';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [sortBy, setSortBy] = useState('closingSoon');
  const [dataSource, setDataSource] = useState('loading'); // 'backend' or 'fallback'

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
    try {
      const data = await getListings();
      if (Array.isArray(data) && data.length > 0) {
        setListings(data);
        setDataSource('backend');
      } else {
        // Fallback to sample listings for rich initial demo
        setListings(sampleListings);
        setDataSource('fallback');
      }
    } catch (err) {
      console.log('Using sample campus listings:', err.message);
      setListings(sampleListings);
      setDataSource('fallback');
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

              {/* Data source badge if fallback */}
              {dataSource === 'fallback' && (
                <div className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                  <AlertCircle className="w-3 h-3" />
                  Showing demo campus items
                </div>
              )}
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
            <p className="text-sm">Loading active campus auctions...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
            <p className="text-base font-semibold text-gray-700">No auctions matched your filters</p>
            <p className="text-xs text-gray-500 mt-1">Try clearing filters or search query.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedCondition('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
            >
              Reset Filters
            </button>
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
