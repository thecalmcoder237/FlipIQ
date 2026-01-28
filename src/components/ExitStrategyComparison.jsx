
import React from 'react';
import { compareExitStrategies } from '@/utils/advancedDealCalculations';
import { Split } from 'lucide-react';

const ExitStrategyComparison = ({ deal, metrics }) => {
  const strategies = compareExitStrategies(deal, metrics);

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <div className="flex items-center gap-2 mb-6">
        <Split className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-white">Exit Strategy Comparison</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Flip */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 hover:border-gold-400/50 transition-all">
          <h4 className="font-bold text-white mb-2">Traditional Flip</h4>
          <p className="text-2xl font-bold text-green-400 mb-4">${Math.round(strategies.flip.profit).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Pros</p>
          <ul className="text-xs text-gray-400 list-disc list-inside mb-2">
            {strategies.flip.pros.map((pro, i) => <li key={i}>{pro}</li>)}
          </ul>
        </div>

        {/* Wholesale */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 hover:border-gold-400/50 transition-all">
          <h4 className="font-bold text-white mb-2">Wholesale</h4>
          <p className="text-2xl font-bold text-blue-400 mb-4">${Math.round(strategies.wholesale.profit).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Pros</p>
          <ul className="text-xs text-gray-400 list-disc list-inside mb-2">
            {strategies.wholesale.pros.map((pro, i) => <li key={i}>{pro}</li>)}
          </ul>
        </div>

        {/* BRRRR */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 hover:border-gold-400/50 transition-all">
          <h4 className="font-bold text-white mb-2">BRRRR (Hold)</h4>
          <p className="text-2xl font-bold text-purple-400 mb-4">${Math.round(strategies.brrrr.profit).toLocaleString()}<span className="text-xs text-gray-500 font-normal">/yr</span></p>
          <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Pros</p>
          <ul className="text-xs text-gray-400 list-disc list-inside mb-2">
            {strategies.brrrr.pros.map((pro, i) => <li key={i}>{pro}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExitStrategyComparison;
