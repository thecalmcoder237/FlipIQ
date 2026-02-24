import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { calculate70RuleMAO } from '@/utils/advancedDealCalculations';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const SeventyPercentRule = ({ deal, metrics, compact = false }) => {
  const [conservative, setConservative] = useState(false);
  
  const mao = calculate70RuleMAO(metrics.arv, metrics.rehabCosts, conservative);
  const difference = mao - deal.purchase_price;
  const isGoodDeal = difference >= 0;

  if (compact) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm overflow-hidden">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground leading-tight">MAO</h3>
            <p className="text-xs text-muted-foreground truncate">Maximum Allowable Offer</p>
          </div>
          {/* Toggle: stacks cleanly on narrow columns */}
          <div className="flex items-center bg-muted rounded-md p-0.5 shrink-0">
            <button
              onClick={() => setConservative(false)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${!conservative ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              70%
            </button>
            <button
              onClick={() => setConservative(true)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${conservative ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              65%
            </button>
          </div>
        </div>

        {/* MAO value */}
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-sm text-muted-foreground">Target MAO</span>
          <span className="font-bold text-accentBrand text-xl">${mao.toLocaleString()}</span>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${isGoodDeal ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {isGoodDeal ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="truncate">{isGoodDeal ? 'Under MAO' : 'Over MAO'} by ${Math.abs(difference).toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-foreground">MAO <span className="text-sm font-normal text-muted-foreground ml-1">(Maximum Allowable Offer)</span></h3>
        <div className="flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => setConservative(false)}
            className={`px-3 py-1 rounded-md text-sm transition-all ${!conservative ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Aggressive (70%)
          </button>
          <button
            onClick={() => setConservative(true)}
            className={`px-3 py-1 rounded-md text-sm transition-all ${conservative ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Conservative (65%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between text-foreground">
            <span>ARV</span>
            <span className="font-semibold">${metrics.arv.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-foreground">
            <span>x {conservative ? '65%' : '70%'}</span>
            <span className="font-semibold">${(metrics.arv * (conservative ? 0.65 : 0.7)).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-foreground pb-2 border-b border-border">
            <span>- Rehab Costs</span>
            <span className="text-red-600 font-semibold">-${metrics.rehabCosts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-foreground text-lg">Target MAO</span>
            <span className="font-bold text-accentBrand text-2xl">${mao.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-6 bg-muted rounded-xl border border-border">
          {isGoodDeal ? (
            <CheckCircle2 className="w-12 h-12 text-green-600 mb-2" />
          ) : (
            <AlertCircle className="w-12 h-12 text-red-600 mb-2" />
          )}
          <span className="text-muted-foreground mb-2">Your Purchase Price</span>
          <span className="text-2xl font-bold text-foreground mb-4">${deal.purchase_price.toLocaleString()}</span>
          
          <div className={`px-4 py-2 rounded-lg font-bold ${isGoodDeal ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {isGoodDeal ? 'UNDER MAO by' : 'OVER MAO by'} ${Math.abs(difference).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeventyPercentRule;
