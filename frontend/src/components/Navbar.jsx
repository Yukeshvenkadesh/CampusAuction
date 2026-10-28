import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Gavel,
  ShoppingBag,
  PlusCircle,
  Package,
  History,
  LogOut,
  LogIn,
  User,
  UserPlus,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-indigo-700 bg-clip-text text-transparent">
                CampusAuction
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-indigo-600">
                Peer-to-Peer Student Bidding
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/')
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Marketplace
            </Link>

            <Link
              to="/create"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/create')
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Sell Product
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/my-listings"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/my-listings')
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  My Listings
                </Link>

                <Link
                  to="/my-bids"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/my-bids')
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <History className="w-4 h-4" />
                  My Bids/Purchases
                </Link>
              </>
            )}

            <Link
              to="/assistant"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/assistant')
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              AI Valuer
            </Link>
          </nav>

          {/* User Profile / Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-bold text-gray-800 leading-tight">
                      {user.name}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-medium">
                      {user.email}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-indigo-600 hover:bg-gray-100 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {isAuthenticated && (
            <div className="p-3 mb-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{user.name}</p>
                <p className="text-[11px] text-gray-500">{user.email}</p>
              </div>
            </div>
          )}

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
              isActive('/') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Marketplace
          </Link>

          <Link
            to="/create"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
              isActive('/create') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Sell Product
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/my-listings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
                  isActive('/my-listings')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Package className="w-4 h-4" />
                My Listings
              </Link>

              <Link
                to="/my-bids"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
                  isActive('/my-bids')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <History className="w-4 h-4" />
                My Bids/Purchases
              </Link>
            </>
          )}

          <Link
            to="/assistant"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
              isActive('/assistant') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI Valuer
          </Link>

          <div className="pt-2 border-t border-gray-100">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-xl"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
