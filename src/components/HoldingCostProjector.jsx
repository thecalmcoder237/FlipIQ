
import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Clock, TrendingUp } from 'lucide-react';
import { calculateScenarioResults } from '@/utils/projectionCalculations';

const HoldingCostProjector = ({ deal }) => {
  const [extraMonths, setExtraMonths] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    setResults(calculateScenarioResults(deal, { holdingMonthAdjustment: extraMonths }));
  }, [deal, extraMonths]);

  if (!results) return null;

  const originalMonths = parseInt(deal.holding_months) || 6;
  const currentTotalMonths = originalMonths + extraMonths;
  const isOverYear = currentTotalMonths > 12;

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
      
      <div className="flex justify-between items-start mb-6">
         <h3 className="font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-blue-400" /> Timeline Simulator
         </h3>
      </div>

      <div className="mb-6">
         <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Timeline Extension</span>
            <span className="font-mono font-bold text-blue-400">+{extraMonths} Months</span>
         </div>
         <Slider 
           value={[extraMonths]} 
           onValueChange={(vals) => setExtraMonths(vals[0])}
           max={12} 
           step={1}
         />
      </div>

      <div className="space-y-3 bg-slate-800/50 p-3 rounded-lg mb-4">
         <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Duration</span>
            <span className={`font-bold ${isOverYear ? 'text-orange-400' : 'text-white'}`}>
                {currentTotalMonths} Months
            </span>
         </div>
         <div className="flex justify-between text-sm">
            <span className="text-gray-400">Extra Holding Cost</span>
            <span className="text-red-400 font-mono">-${Math.abs(results.impact.costIncrease).toLocaleString()}</span>
         </div>
         <div className="flex justify-between text-sm pt-2 border-t border-white/5">
            <span className="text-gray-400">New Net Profit</span>
            <span className="text-white font-bold font-mono">${results.netProfit.toLocaleString()}</span>
         </div>
      </div>
      
      {isOverYear && (
          <p className="text-xs text-orange-400 text-center">
             Warning: Long holding periods significantly increase risk.
          </p>
      )}
    </div>
  );
};

export default HoldingCostProjector;
