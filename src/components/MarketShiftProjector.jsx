
import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateScenarioResults } from '@/utils/projectionCalculations';

const MarketShiftProjector = ({ deal }) => {
  const [shiftPercent, setShiftPercent] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    setResults(calculateScenarioResults(deal, { arvShiftPercent: shiftPercent }));
  }, [deal, shiftPercent]);

  if (!results) return null;

  const isNegative = shiftPercent < 0;

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${isNegative ? 'bg-red-500' : 'bg-green-500'}`} />
      
      <div className="flex justify-between items-start mb-6">
         <h3 className="font-bold text-white">Market Shift Analysis</h3>
      </div>

      <div className="flex gap-2 mb-6">
         <Button 
            variant="outline" size="sm" 
            onClick={() => setShiftPercent(-10)}
            className={`flex-1 border-white/10 ${shiftPercent === -10 ? 'bg-red-900/30 text-red-400 border-red-500' : 'text-gray-400'}`}
         >
            <TrendingDown size={14} className="mr-1"/> Bear
         </Button>
         <Button 
            variant="outline" size="sm" 
            onClick={() => setShiftPercent(0)}
            className={`flex-1 border-white/10 ${shiftPercent === 0 ? 'bg-slate-700 text-white' : 'text-gray-400'}`}
         >
            <Minus size={14} className="mr-1"/> Stable
         </Button>
         <Button 
            variant="outline" size="sm" 
            onClick={() => setShiftPercent(5)}
            className={`flex-1 border-white/10 ${shiftPercent === 5 ? 'bg-green-900/30 text-green-400 border-green-500' : 'text-gray-400'}`}
         >
            <TrendingUp size={14} className="mr-1"/> Bull
         </Button>
      </div>

      <div className="mb-6">
         <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">ARV Adjustment</span>
            <span className={`font-mono font-bold ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                {shiftPercent > 0 ? '+' : ''}{shiftPercent}%
            </span>
         </div>
         <Slider 
           value={[shiftPercent]} 
           onValueChange={(vals) => setShiftPercent(vals[0])}
           min={-20}
           max={20} 
           step={1}
         />
      </div>

      <div className="bg-slate-800/50 p-3 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
             <span className="text-gray-400">New ARV</span>
             <span className="text-white font-bold">${results.newARV.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
             <span className="text-gray-400">Profit Impact</span>
             <span className={`font-mono font-bold ${results.impact.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {results.impact.profit >= 0 ? '+' : ''}{Math.round(results.impact.profit).toLocaleString()}
             </span>
          </div>
      </div>
    </div>
  );
};

export default MarketShiftProjector;
