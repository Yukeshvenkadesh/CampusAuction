import React, { useState } from 'react';
import { Sparkles, Bot, ArrowRight, DollarSign, HelpCircle, CheckCircle } from 'lucide-react';

export default function AIAssistant() {
  const [itemType, setItemType] = useState('cycle');
  const [modelName, setModelName] = useState('');
  const [condition, setCondition] = useState('Good');
  const [ageMonths, setAgeMonths] = useState('12');
  const [advice, setAdvice] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

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
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Campus Auction Intelligence
          </div>
          <h1 className="text-3xl font-black text-gray-900">AI Valuation Assistant</h1>
          <p className="text-sm text-gray-500 mt-2">
            Get instant fair price recommendations and starting bid strategies based on campus historical sales.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl">
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
                Model or Title
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. Hero Sprint Pro / Casio fx-991EX / Tanenbaum Networking"
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p><strong>Duration Tip:</strong> {advice.suggestedDuration}</p>
                <p><strong>Market Insight:</strong> {advice.tip}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
