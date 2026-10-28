import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  X,
  Trash2,
} from 'lucide-react';
import { createListing } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 48 hours default for auction closing
  const defaultClosing = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [formData, setFormData] = useState({
    title: '',
    category: 'cycle',
    description: '',
    condition: 'Good',
    startingPrice: '',
    minIncrement: '50',
    closingTime: defaultClosing,
  });

  const [base64Photos, setBase64Photos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Convert uploaded files to Base64 data URLs
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setStatus({ type: 'error', message: 'Please upload valid image files (JPEG, PNG, WebP).' });
        return;
      }

      // Check max size (limit to ~4MB per image)
      if (file.size > 4 * 1024 * 1024) {
        setStatus({ type: 'error', message: 'Each image must be under 4MB.' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64String = uploadEvent.target.result;
        setBase64Photos((prev) => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ''; // reset file input
  };

  const handleRemovePhoto = (index) => {
    setBase64Photos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    if (!user?._id) {
      setStatus({ type: 'error', message: 'You must be signed in to list a product.' });
      setSubmitting(false);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      description: formData.description.trim(),
      condition: formData.condition,
      startingPrice: parseFloat(formData.startingPrice),
      minIncrement: parseFloat(formData.minIncrement) || 50,
      closingTime: new Date(formData.closingTime).toISOString(),
      photos: base64Photos.length > 0 ? base64Photos : [],
      sellerId: user._id, // Attach logged-in user ID as sellerId
    };

    try {
      const created = await createListing(payload);
      setStatus({
        type: 'success',
        message: 'Your product auction is live in the database!',
      });
      setTimeout(() => {
        if (created && created._id) {
          navigate(`/listing/${created._id}`);
        } else {
          navigate('/my-listings');
        }
      }, 1200);
    } catch (err) {
      console.error('Error creating listing:', err);
      setStatus({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to publish listing.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl shadow-indigo-50/50">
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Sell a Product</h1>
                <p className="text-xs text-gray-500">
                  List your campus gear directly into the active database.
                </p>
              </div>
            </div>

            {user && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Seller</span>
                <span className="text-xs font-bold text-indigo-600">{user.name}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Product Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Hero Sprint Pro Cycle (with lock & helmet)"
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="cycle">Cycle</option>
                  <option value="calculator">Calculator</option>
                  <option value="books">Books & Notes</option>
                  <option value="electronics">Electronics</option>
                  <option value="other">Other Campus Gear</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Condition *
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="New">Brand New / Unused</option>
                  <option value="Like New">Like New (Mint)</option>
                  <option value="Good">Good (Working smoothly)</option>
                  <option value="Fair">Fair (Noticeable cosmetic wear)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Description & Included Accessories *
              </label>
              <textarea
                name="description"
                rows="4"
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Mention semester usage, any repair history, pickup hostel location, included chargers, bills, etc."
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>

            {/* Pricing & Increment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Starting Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    name="startingPrice"
                    min="1"
                    step="1"
                    required
                    value={formData.startingPrice}
                    onChange={handleChange}
                    placeholder="e.g. 1500"
                    className="w-full pl-8 pr-4 py-3 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Minimum Bid Increment (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    name="minIncrement"
                    min="1"
                    step="1"
                    required
                    value={formData.minIncrement}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-3 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Closing Date & Time */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Auction Closing Date & Time *
              </label>
              <input
                type="datetime-local"
                name="closingTime"
                required
                value={formData.closingTime}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            {/* Base64 Photos Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Product Photos (Stored securely as Base64 in Database)
              </label>
              <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-gray-50/50 transition-colors">
                <input
                  type="file"
                  id="productPhotos"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="productPhotos"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 hover:underline">
                    Click to browse and upload photos
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Supports JPEG, PNG, WebP (Converted to Base64)
                  </span>
                </label>
              </div>

              {/* Photo Previews */}
              {base64Photos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {base64Photos.map((photo, i) => (
                    <div
                      key={i}
                      className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                    >
                      <img
                        src={formatPhotoUrl(photo)}
                        alt={`Upload preview ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute inset-0 bg-red-600/80 text-white text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {status.message && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  status.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {status.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Upload className="w-4 h-4" />
              <span>{submitting ? 'Publishing to Database...' : 'Publish Product Auction'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
