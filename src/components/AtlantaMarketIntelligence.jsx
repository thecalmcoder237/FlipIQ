
import React from 'react';
import { atlantaMarketData } from '@/constants/atlantaMarketData';
import { MapPin, TrendingUp, DollarSign, Clock } from 'lucide-react';

const AtlantaMarketIntelligence = ({ deal }) => {
  const zipData = atlantaMarketData[deal.zip_code];
  const hasData = !!zipData;

  if (!hasData) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 text-center">
        <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Market Data Not Available</h3>
        <p className="text-gray-400">
          We don't have specific data for ZIP {deal.zip_code} yet. 
          Currently tracking: {Object.keys(atlantaMarketData).join(', ')}.
        </p>
      </div>
    );
  }

  // Calculate comparisons
  const dealPpsqft = Math.round(deal.arv / deal.sqft);
  const ppsqftDiff = dealPpsqft - zipData.price_per_sqft;
  const isPremium = ppsqftDiff > 0;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-gold-400" />
          <div>
            <h3 className="text-xl font-bold text-white">Atlanta Market Intel</h3>
            <p className="text-xs text-gold-400 font-bold">{deal.zip_code}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-900/50 px-3 py-1 rounded-full border border-white/10">
          <span className="text-gray-400 text-xs uppercase">Hotness</span>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-3 rounded-full ${i < zipData.market_hotness ? 'bg-green-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
          <span className="text-white font-bold ml-1">{zipData.market_hotness}/10</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-gray-400 text-sm">Appreciation</span>
          </div>
          <p className="text-2xl font-bold text-white">+{zipData.appreciation_trend}%</p>
          <p className="text-xs text-gray-500">Year over Year</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-sm">Avg DOM</span>
          </div>
          <p className="text-2xl font-bold text-white">{zipData.days_on_market_avg}</p>
          <p className="text-xs text-gray-500">Days on Market</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold-400" />
            <span className="text-gray-400 text-sm">Avg $/sqft</span>
          </div>
          <p className="text-2xl font-bold text-white">${zipData.price_per_sqft}</p>
          <p className={`text-xs ${isPremium ? 'text-green-400' : 'text-blue-400'}`}>
            Deal is {Math.abs(ppsqftDiff)} {isPremium ? 'above' : 'below'} avg
          </p>
        </div>
      </div>
    </div>
  );
};

export default AtlantaMarketIntelligence;
