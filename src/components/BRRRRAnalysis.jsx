
import React, { useState } from 'react';
import { calculateBRRRRProjection } from '@/utils/advancedDealCalculations';
import { RefreshCw, Wallet, TrendingUp } from 'lucide-react';

const BRRRRAnalysis = ({ deal, metrics }) => {
  const [refiPercent, setRefiPercent] = useState(75);
  
  const analysis = calculateBRRRRProjection(
    deal.purchase_price,
    metrics.arv,
    metrics.rehabCosts,
    refiPercent
  );

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-blue-400" />
          BRRRR Strategy
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Refi LTV: {refiPercent}%</span>
          <input
            type="range"
            min="70"
            max="90"
            value={refiPercent}
            onChange={(e) => setRefiPercent(Number(e.target.value))}
            className="w-32 accent-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-gold-400" />
            <span className="text-gray-300 font-medium">Refinance Amount</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">${analysis.refiAmount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Based on ARV of ${metrics.arv.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-gray-300 font-medium">Monthly Cash Flow</span>
          </div>
          <p className={`text-2xl font-bold ${analysis.monthlyCashFlow > 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${Math.round(analysis.monthlyCashFlow).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Est. Rent - PITI - Expenses</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <span className="text-gray-300 font-medium">Capital Left in Deal</span>
          </div>
          <p className={`text-2xl font-bold ${analysis.capitalRecovered >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${analysis.capitalRecovered >= 0 ? `+$${analysis.capitalRecovered.toLocaleString()}` : `-$${Math.abs(analysis.capitalRecovered).toLocaleString()}`}
          </p>
          <p className="text-xs text-gray-500">
            {analysis.capitalRecovered >= 0 ? "Infinite Return (Perfect BRRRR)" : "Cash remaining in property"}
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
        <p className="text-blue-200 text-sm">
          <strong>Analysis:</strong> {analysis.isPerfectBRRRR 
            ? "Excellent BRRRR candidate! You can pull all your initial capital out and potentially more, essentially acquiring this property for free." 
            : `You will leave approximately $${Math.abs(analysis.capitalRecovered).toLocaleString()} in the deal. Ensure the monthly cash flow justifies this equity position.`}
        </p>
      </div>
    </div>
  );
};

export default BRRRRAnalysis;
