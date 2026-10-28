import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  CheckCheck,
  Zap,
} from 'lucide-react';
import {
  createAlert,
  getUserAlerts,
  deleteAlert,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: null, message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: '' }), 4000);
  };

  const loadData = async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserAlerts(user._id);
      if (data) {
        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      }
    } catch (err) {
      console.error('Failed to load user alerts:', err);
      setError('Unable to load your alerts from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?._id]);

  // Real-time notification listener
  useEffect(() => {
    if (!user?._id) return;

    if (!socket.connected) {
      socket.connect();
    }

    const handleNewAlert = (data) => {
      if (data && data.userId === user._id) {
        if (data.notification) {
          setNotifications((prev) => [data.notification, ...prev]);
        }
        showToast(
          'success',
          `⚡ Match Found! "${data.listing?.title || 'An item'}" was just listed matching your alert.`
        );
      }
    };

    socket.on('newAlertNotification', handleNewAlert);

    return () => {
      socket.off('newAlertNotification', handleNewAlert);
    };
  }, [user?._id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!keyword.trim() || !user?._id) return;

    setSubmitting(true);
    try {
      const created = await createAlert({
        userId: user._id,
        keyword: keyword.trim(),
        category,
        maxPrice: maxPrice ? parseFloat(maxPrice) : 999999,
      });

      setAlerts((prev) => [created, ...prev]);
      showToast('success', `Alert for "${keyword}" has been activated!`);
      setKeyword('');
      setMaxPrice('');
      setCategory('all');
    } catch (err) {
      console.error('Failed to create alert:', err);
      showToast('error', err.response?.data?.error || err.message || 'Failed to create alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alertId, alertKeyword) => {
    try {
      await deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      showToast('success', `Alert "${alertKeyword}" deleted.`);
    } catch (err) {
      console.error('Failed to delete alert:', err);
      showToast('error', 'Failed to remove alert.');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?._id) return;
    try {
      await markAllNotificationsRead(user._id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('success', 'All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast */}
        {toast.message && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-fadeIn transition-all ${
              toast.type === 'error'
                ? 'bg-red-600 text-white shadow-red-200'
                : 'bg-emerald-600 text-white shadow-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 text-xs font-bold mb-3">
              <Bell className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Campus Watchlist & Alert Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Never Miss What You Need
            </h1>
            <p className="text-sm text-indigo-200 mt-2 leading-relaxed">
              Looking for a scientific calculator, mountain cycle, semester textbook, or hostel
              essentials? Set your price ceiling and keyword alerts. We'll automatically notify you the
              second a fellow student puts it up for auction!
            </p>
          </div>
        </div>

        {/* Grid: Create Alert (Left) & Active Alerts / Matches (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create Alert Form (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-sm sticky top-24">
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Set a New Item Alert</h2>
                  <p className="text-[11px] text-gray-400">Get notified when listings match</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Search Keyword or Item Name *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Scientific Calculator, Geared Cycle..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Calculator', 'Cycle', 'Engineering', 'Headphones'].map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => setKeyword(suggestion)}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 px-2 py-0.5 rounded-md font-semibold transition-colors"
                      >
                        +{suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Category Filter
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="all">All Categories</option>
                    <option value="cycle">Bicycle / Cycle</option>
                    <option value="calculator">Scientific Calculator</option>
                    <option value="books">Books & Notes</option>
                    <option value="electronics">Electronics & Gadgets</option>
                    <option value="other">Hostel Needs / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Maximum Price Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500 (Leave blank for any price)"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Only notify if starting price is at or below this amount.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !keyword.trim()}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  <span>Activate Alert</span>
                </button>
              </form>
            </div>
          </div>

          {/* Main Content: Triggered Matches & Active Alerts (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section A: Triggered Notifications / Matches */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Matched Items & In-Stock Alerts
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      Listings matching your criteria posted by classmates
                    </p>
                  </div>
                </div>

                {notifications.length > 0 && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors self-start sm:self-auto"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark all as read ({unreadCount})</span>
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs">Checking for matched campus items...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-700">No matching items posted yet</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                    Whenever a classmate lists an item with your keywords or below your max price,
                    it will instantly show up here and notify you in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {notifications.map((notif) => {
                    const listing = notif.listingId;
                    const photo =
                      listing?.photos && listing.photos.length > 0 ? listing.photos[0] : '';
                    const isClosed =
                      listing?.status !== 'active' ||
                      (listing?.closingTime && new Date(listing.closingTime) < new Date());

                    return (
                      <div
                        key={notif._id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          notif.read
                            ? 'bg-white border-gray-200'
                            : 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {photo ? (
                            <img
                              src={formatPhotoUrl(photo)}
                              alt=""
                              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                              <Tag className="w-6 h-6" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                              )}
                              <h4 className="text-sm font-bold text-gray-900 truncate">
                                {listing?.title || notif.title}
                              </h4>
                              {notif.keyword && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold shrink-0">
                                  Alert: "{notif.keyword}"
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {notif.message}
                            </p>

                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                              {listing?.startingPrice !== undefined && (
                                <span className="font-bold text-gray-700">
                                  Starts: ₹{listing.startingPrice}
                                </span>
                              )}
                              {listing?.currentBid !== undefined && (
                                <span className="font-extrabold text-indigo-600">
                                  Current Bid: ₹{listing.currentBid}
                                </span>
                              )}
                              <span>
                                {new Date(notif.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {!notif.read && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notif._id)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                          {listing?._id ? (
                            <Link
                              to={`/listing/${listing._id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-colors"
                            >
                              <span>View Listing</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Listing unavailable</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: Active Watchlist Alerts */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2.5 pb-5 border-b border-gray-100 mb-6">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Your Active Watchlist Alerts</h2>
                  <p className="text-[11px] text-gray-400">
                    Currently monitored keywords and maximum price criteria
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400">
                    No active alerts configured. Use the form on the left to set up your first
                    watchlist alert!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert._id}
                      className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-indigo-200 transition-all flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-extrabold text-gray-900 capitalize">
                            "{alert.keyword}"
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(alert._id, alert.keyword)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                            Category: {alert.category || 'All'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {alert.maxPrice >= 999999 ? 'Any Price' : `Max: ₹${alert.maxPrice}`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                        <span>
                          Created {new Date(alert.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-semibold text-indigo-600">
                          {(alert.notifications || []).length} matches
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
