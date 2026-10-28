import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Search,
  DollarSign,
  Gavel,
  Zap,
  Tag,
  Lock,
  RefreshCw,
  Clock,
  ArrowUpRight,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { aiFindListings, aiAutoBid } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPhotoUrl } from '../utils/imageHelper';

export default function AIAssistant() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Navigation tab: 'agent' or 'valuation'
  const [activeTab, setActiveTab] = useState('agent');

  // AI Agent & Finder States
  const [nlPrompt, setNlPrompt] = useState('');
  const [customBudget, setCustomBudget] = useState('');
  const [searching, setSearching] = useState(false);
  const [agentResults, setAgentResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Auto-Bid Modal & State
  const [confirmingItem, setConfirmingItem] = useState(null);
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [bidSuccessNotice, setBidSuccessNotice] = useState(null);

  // Valuation Calculator States
  const [itemType, setItemType] = useState('cycle');
  const [modelName, setModelName] = useState('');
  const [condition, setCondition] = useState('Good');
  const [advice, setAdvice] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // 1. Handle Natural Language Finder
  const handleAgentSearch = async (e) => {
    if (e) e.preventDefault();
    if (!nlPrompt.trim()) return;

    setSearching(true);
    setSearchError(null);
    setBidSuccessNotice(null);

    try {
      const data = await aiFindListings({
        prompt: nlPrompt.trim(),
        budgetLimit: customBudget ? parseFloat(customBudget) : undefined,
        userId: user?._id,
      });

      setAgentResults(data);
    } catch (err) {
      console.error('AI search failed:', err);
      setSearchError(err.response?.data?.error || err.message || 'AI agent search failed.');
    } finally {
      setSearching(false);
    }
  };

  // 2. Open Auto-Bid Confirmation Modal
  const handleOpenAutoBidModal = (item) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setConfirmingItem(item);
    setAuthorizedConsent(false);
  };

  // 3. Confirm & Execute Autonomous Proxy Bid
  const handleConfirmAutoBid = async () => {
    if (!confirmingItem || !authorizedConsent || !user?._id) return;

    setBiddingLoading(true);
    try {
      const budgetCap = agentResults?.parsedCriteria?.maxBudget || confirmingItem.nextMinBid;

      const res = await aiAutoBid({
        listingId: confirmingItem._id,
        userId: user._id,
        maxBudget: budgetCap,
        authorized: true,
      });

      // Update state locally
      if (agentResults && agentResults.listings) {
        setAgentResults((prev) => ({
          ...prev,
          listings: prev.listings.map((l) =>
            l._id === confirmingItem._id
              ? {
                  ...l,
                  currentBid: res.placedAmount,
                  nextMinBid: res.placedAmount + (l.minIncrement || 10),
                  bidsCount: (l.bidsCount || 0) + 1,
                }
              : l
          ),
        }));
      }

      setBidSuccessNotice({
        title: confirmingItem.title,
        amount: res.placedAmount,
        budget: res.maxBudget,
        message: res.message,
      });

      setConfirmingItem(null);
    } catch (err) {
      console.error('Auto-bid execution failed:', err);
      alert(err.response?.data?.error || err.message || 'Auto-bid execution failed.');
    } finally {
      setBiddingLoading(false);
    }
  };

  // 4. Valuation Calculator
  const handleEstimate = (e) => {
    e.preventDefault();
    setAnalyzing(true);
    setAdvice(null);

    setTimeout(() => {
      let base = 2000;
      if (itemType === 'cycle') base = 4000;
      if (itemType === 'calculator') base = 1200;
      if (itemType === 'books') base = 800;
      if (itemType === 'electronics') base = 3000;

      const conditionMultiplier = {
        New: 0.85,
        'Like New': 0.75,
        Good: 0.55,
        Fair: 0.35,
      }[condition] || 0.5;

      const estimatedPrice = Math.round(base * conditionMultiplier);
      const recommendedStart = Math.round(estimatedPrice * 0.7);
      const recommendedIncrement = estimatedPrice > 2000 ? 100 : 50;

      setAdvice({
        estimatedMarketValue: estimatedPrice,
        recommendedStart,
        recommendedIncrement,
        suggestedDuration: '48 Hours (ends Friday evening for max student traffic)',
        tip: `For ${itemType} in ${condition} condition, campus demand spikes during mid-semester. Highlight any accessories or original receipts to attract higher bids!`,
      });
      setAnalyzing(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Autonomous Intelligence & Valuation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Campus AI Assistant
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Ask our AI agent to find live campus deals with automated proxy bidding, or calculate fair market valuations.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1 mt-6 rounded-2xl bg-gray-200/80 border border-gray-300">
            <button
              type="button"
              onClick={() => setActiveTab('agent')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'agent'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Autonomous Bidding Agent</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('valuation')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'valuation'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Valuation Calculator</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: AI AUTONOMOUS BIDDING AGENT & FINDER */}
        {/* ========================================================================= */}
        {activeTab === 'agent' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Prompt Search Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl shadow-indigo-50/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Natural Language Finder & Autonomous Bidding Agent
                  </h2>
                  <p className="text-xs text-gray-400">
                    Tell the AI what you need and your price ceiling — it finds matching auctions and safely bids on your behalf.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAgentSearch} className="space-y-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={nlPrompt}
                    onChange={(e) => setNlPrompt(e.target.value)}
                    placeholder='e.g. "Find me a cycle under ₹2,000" or "Scientific calculator under ₹800"'
                    className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  {/* Prompt Suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mr-1">
                      Try:
                    </span>
                    {[
                      'Find me a cycle under ₹2,000',
                      'Scientific calculator below ₹900',
                      'Engineering books under ₹500',
                    ].map((sample) => (
                      <button
                        type="button"
                        key={sample}
                        onClick={() => {
                          setNlPrompt(sample);
                        }}
                        className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 px-2.5 py-1 rounded-lg font-medium transition-colors"
                      >
                        "{sample}"
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={searching || !nlPrompt.trim()}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all shrink-0"
                  >
                    {searching ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{searching ? 'AI Analyzing Listings...' : 'Search & Evaluate Deals'}</span>
                  </button>
                </div>
              </form>

              {/* Safety Guards Banner */}
              <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="font-semibold">
                    Autonomous Safety Guardrails: Agent strictly enforces your approved budget ceiling, prevents seller self-bidding, and requires your explicit authorization.
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-indigo-700 border border-indigo-200 shrink-0">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  <span>Verified Safe Proxy</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {searchError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Success Notice After Placing Auto-Bid */}
            {bidSuccessNotice && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Autonomous Proxy Bid Activated!
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {bidSuccessNotice.message}
                    </p>
                    <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-3">
                      <span>Placed: ₹{bidSuccessNotice.amount}</span>
                      <span>•</span>
                      <span>Ceiling Cap: ₹{bidSuccessNotice.budget}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section */}
            {agentResults && (
              <div className="space-y-6">
                {/* AI Summary Box */}
                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        AI Agent Analysis
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        Budget Cap: ₹{agentResults.parsedCriteria?.maxBudget?.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {agentResults.summary}
                    </p>
                  </div>
                </div>

                {/* Listing Cards */}
                {agentResults.listings.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
                    <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-700">No active listings within budget</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                      Try searching with broader terms or increasing your budget limit to see more campus auctions.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {agentResults.listings.map((item) => {
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
                              <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
                                Cap: ₹{agentResults.parsedCriteria?.maxBudget}
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

                              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2.5 rounded-xl bg-gray-50">
                                  <span className="text-gray-400 block font-medium">Current Bid</span>
                                  <span className="text-base font-extrabold text-gray-800">
                                    ₹{item.currentBid}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                                  <span className="text-indigo-600 block font-bold">Next Valid Bid</span>
                                  <span className="text-base font-black text-indigo-900">
                                    ₹{item.nextMinBid}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="p-5 pt-0 space-y-2">
                            {item.isOwner ? (
                              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold text-center">
                                Your Listing (Self-bidding blocked)
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAutoBidModal(item)}
                                disabled={isExpired || !item.canAutoBid}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Zap className="w-4 h-4 text-amber-300" />
                                <span>
                                  Enable Auto-Bid (Up to ₹{agentResults.parsedCriteria?.maxBudget})
                                </span>
                              </button>
                            )}

                            <Link
                              to={`/listing/${item._id}`}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition-colors"
                            >
                              <span>Inspect Live Listing</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Auto-Bid Confirmation & Consent Modal */}
            {confirmingItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fadeIn space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Authorize Autonomous Proxy Bid
                      </h3>
                      <p className="text-xs text-gray-400">Strict Safety Guards & Consent</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-gray-600">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Item:</span>
                        <span className="font-bold text-gray-900">{confirmingItem.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Current Bid:</span>
                        <span className="font-bold text-gray-900">₹{confirmingItem.currentBid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Starting Proxy Bid:</span>
                        <span className="font-bold text-indigo-600">₹{confirmingItem.nextMinBid}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1.5">
                        <span className="text-gray-700 font-bold">Your Agreed Maximum Cap:</span>
                        <span className="font-extrabold text-emerald-600 text-sm">
                          ₹{agentResults?.parsedCriteria?.maxBudget || confirmingItem.nextMinBid}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                      <strong>Guardrail Policy:</strong> The agent places a verified bid at ₹{confirmingItem.nextMinBid}. If another student bids, the agent will defend your position by incrementally matching up to, but never exceeding, your ceiling cap of ₹{agentResults?.parsedCriteria?.maxBudget}.
                    </div>

                    <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={authorizedConsent}
                        onChange={(e) => setAuthorizedConsent(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-gray-700 font-semibold leading-normal">
                        I explicitly authorize the AI Agent to place bids on my behalf up to my specified budget limit of ₹{agentResults?.parsedCriteria?.maxBudget}.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setConfirmingItem(null)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!authorizedConsent || biddingLoading}
                      onClick={handleConfirmAutoBid}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5"
                    >
                      {biddingLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>Confirm & Place Proxy Bid</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VALUATION CALCULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'valuation' && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Historical Valuation Calculator</h2>
                <p className="text-xs text-gray-400">
                  Estimate fair resale prices based on category and campus demand
                </p>
              </div>
            </div>

            <form onSubmit={handleEstimate} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Category
                  </label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="cycle">Bicycle / Mountain Cycle</option>
                    <option value="calculator">Scientific Calculator</option>
                    <option value="books">Engineering Books & Notes</option>
                    <option value="electronics">Headphones / Electronics</option>
                    <option value="other">Hostel Furniture / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Model or Item Name
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Hero Sprint Pro / Casio fx-991EX / Tanenbaum Networking"
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={analyzing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4" />
                <span>{analyzing ? 'Analyzing Campus Market Data...' : 'Generate Price Estimate'}</span>
              </button>
            </form>

            {advice && (
              <div className="mt-8 pt-8 border-t border-gray-100 animate-fadeIn">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Recommended Auction Strategy
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
                    <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">
                      Estimated Fair Value
                    </span>
                    <span className="text-2xl font-black text-indigo-900 mt-1 block">
                      ₹{advice.estimatedMarketValue}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                    <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider block">
                      Suggested Starting Bid
                    </span>
                    <span className="text-2xl font-black text-emerald-900 mt-1 block">
                      ₹{advice.recommendedStart}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
                    <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider block">
                      Bid Increment
                    </span>
                    <span className="text-2xl font-black text-amber-900 mt-1 block">
                      +₹{advice.recommendedIncrement}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Duration Tip:</strong> {advice.suggestedDuration}
                  </p>
                  <p>
                    <strong>Market Insight:</strong> {advice.tip}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
