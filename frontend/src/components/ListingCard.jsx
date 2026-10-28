import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Tag, ArrowUpRight, ShieldCheck, Flame } from 'lucide-react';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function ListingCard({ listing }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(listing.closingTime) - new Date();
      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Auction Ended');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s left`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [listing.closingTime]);

  const rawPhoto = listing.photos && listing.photos.length > 0 ? listing.photos[0] : '';
  const mainImage = formatPhotoUrl(rawPhoto);

  const categoryColors = {
    cycle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    calculator: 'bg-blue-50 text-blue-700 border-blue-200',
    books: 'bg-amber-50 text-amber-700 border-amber-200',
    electronics: 'bg-purple-50 text-purple-700 border-purple-200',
    other: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const badgeColor = categoryColors[listing.category] || categoryColors.other;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1">
      {/* Image container */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={mainImage}
          alt={listing.title}
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Category & Condition Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm uppercase tracking-wide ${badgeColor}`}
          >
            {listing.category}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/90 text-gray-800 shadow-sm border border-gray-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            {listing.condition}
          </span>
        </div>

        {/* Countdown Pill */}
        <div className="absolute bottom-3 right-3">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md backdrop-blur-md ${
              isExpired ? 'bg-red-500/90 text-white' : 'bg-gray-900/80 text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {listing.title}
          </h3>
          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{listing.description}</p>
        </div>

        {/* Pricing info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium block">
                Current Bid
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-indigo-600">
                  ₹{listing.currentBid || listing.startingPrice}
                </span>
                <span className="text-[11px] text-gray-400">(start: ₹{listing.startingPrice})</span>
              </div>
            </div>

            <Link
              to={`/listing/${listing._id}`}
              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-indigo-600 text-white transition-colors"
            >
              <span>Bid Now</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
