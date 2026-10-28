import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  Upload,
  Calendar,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { getUserListings, updateListing, deleteListing } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Notification message
  const [toast, setToast] = useState({ type: null, message: '' });

  // Modal states
  const [editingItem, setEditingItem] = useState(null);
  const [cancellingItem, setCancellingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'other',
    description: '',
    condition: 'Good',
    startingPrice: '',
    minIncrement: '',
    closingTime: '',
    photos: [],
  });

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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: '' }), 4000);
  };

  // Open Edit Modal with current item data
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    let formattedClosing = '';
    if (item.closingTime) {
      const d = new Date(item.closingTime);
      formattedClosing = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }

    setEditForm({
      title: item.title || '',
      category: item.category || 'other',
      description: item.description || '',
      condition: item.condition || 'Good',
      startingPrice: item.startingPrice?.toString() || '0',
      minIncrement: item.minIncrement?.toString() || '10',
      closingTime: formattedClosing,
      photos: Array.isArray(item.photos) ? [...item.photos] : [],
    });
  };

  const handleEditPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditForm((prev) => ({
          ...prev,
          photos: [...prev.photos, ev.target.result],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setEditForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem || !user?._id) return;

    setActionLoading(true);
    try {
      const payload = {
        userId: user._id,
        title: editForm.title.trim(),
        category: editForm.category,
        description: editForm.description.trim(),
        condition: editForm.condition,
        startingPrice: parseFloat(editForm.startingPrice),
        minIncrement: parseFloat(editForm.minIncrement) || 10,
        closingTime: new Date(editForm.closingTime).toISOString(),
        photos: editForm.photos,
      };

      const res = await updateListing(editingItem._id, payload);
      const updatedListing = res.listing || { ...editingItem, ...payload };

      // Update local state instantly
      setListings((prev) =>
        prev.map((item) => (item._id === editingItem._id ? updatedListing : item))
      );

      showToast('success', `Listing "${editForm.title}" updated successfully!`);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update listing:', err);
      showToast('error', err.response?.data?.error || err.message || 'Failed to update listing.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingItem || !user?._id) return;

    setActionLoading(true);
    try {
      await deleteListing(cancellingItem._id, user._id, false);

      // Instantly mark status as cancelled in state
      setListings((prev) =>
        prev.map((item) =>
          item._id === cancellingItem._id ? { ...item, status: 'cancelled' } : item
        )
      );

      showToast('success', `Listing "${cancellingItem.title}" has been cancelled.`);
      setCancellingItem(null);
    } catch (err) {
      console.error('Failed to cancel listing:', err);
      showToast('error', err.response?.data?.error || err.message || 'Failed to cancel listing.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Toast Alert */}
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
              <CheckCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
              <Package className="w-3.5 h-3.5" />
              Seller Dashboard
            </div>
            <h1 className="text-3xl font-black text-gray-900">My Product Listings</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Track active bids, update item details, and manage listings you've put up for auction.
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
              const isCancelled = item.status === 'cancelled';
              const isClosed = isExpired || item.status === 'sold' || isCancelled;

              return (
                <div
                  key={item._id}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    isCancelled
                      ? 'border-red-200 opacity-80'
                      : 'border-gray-200 hover:shadow-lg'
                  }`}
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
                          isCancelled
                            ? 'bg-rose-600'
                            : isExpired || item.status !== 'active'
                            ? 'bg-amber-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {isCancelled ? 'Cancelled' : isExpired ? 'Closed' : item.status}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                        <span className="text-[11px] font-semibold text-gray-400 shrink-0">
                          {item.condition}
                        </span>
                      </div>
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

                  {/* Actions Bar */}
                  <div className="p-5 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        disabled={isClosed}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCancellingItem(item)}
                        disabled={isClosed}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel</span>
                      </button>
                    </div>

                    <Link
                      to={`/listing/${item._id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-200"
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

        {/* Edit Listing Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Listing</h3>
                    <p className="text-xs text-gray-500">Update item details for student bidders</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Item Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Category
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="cycle">Bicycle / Cycle</option>
                      <option value="calculator">Scientific Calculator</option>
                      <option value="books">Books & Notes</option>
                      <option value="electronics">Electronics & Gadgets</option>
                      <option value="other">Hostel Needs / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Condition
                    </label>
                    <select
                      value={editForm.condition}
                      onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Brand New">Brand New</option>
                      <option value="Like New">Like New</option>
                      <option value="Good">Good Condition</option>
                      <option value="Fair">Fair / Usable</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Starting Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editForm.startingPrice}
                      onChange={(e) =>
                        setEditForm({ ...editForm, startingPrice: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Note: Cannot alter starting price if active bids are already placed.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Min Increment (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editForm.minIncrement}
                      onChange={(e) => setEditForm({ ...editForm, minIncrement: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Auction Closing Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editForm.closingTime}
                    onChange={(e) => setEditForm({ ...editForm, closingTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Photos ({editForm.photos.length})
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editForm.photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden group"
                      >
                        <img
                          src={formatPhotoUrl(p)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 text-gray-400 hover:text-indigo-600 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-[9px] font-bold mt-0.5">Add</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleEditPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5"
                  >
                    {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancellingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 text-center">Cancel this Auction?</h3>
              <p className="text-xs text-gray-500 text-center mt-2 leading-relaxed">
                Are you sure you want to cancel{' '}
                <strong className="text-gray-800">"{cancellingItem.title}"</strong>? This will
                immediately close the auction and prevent any new bids or questions.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCancellingItem(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Keep Auction Active
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 flex items-center justify-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Cancel Listing</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
