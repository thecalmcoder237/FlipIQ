
import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateScenarioResults } from '@/utils/projectionCalculations';

const RehabCostProjector = ({ deal, onSaveScenario }) => {
  const [overrunPercent, setOverrunPercent] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    setResults(calculateScenarioResults(deal, { rehabOverrunPercent: overrunPercent }));
  }, [deal, overrunPercent]);

  if (!results) return null;

  const isCritical = results.roi < 5;
  const isWarning = results.roi < 10;
  
  const statusColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} />
      
      <div className="flex justify-between items-start mb-6">
         <h3 className="font-bold text-white">Rehab Overrun Simulator</h3>
         <div className="text-right">
            <p className="text-xs text-gray-400">Projected ROI</p>
            <p className={`font-bold text-xl ${isCritical ? 'text-red-400' : 'text-green-400'}`}>
               {results.roi.toFixed(1)}%
            </p>
         </div>
      </div>

      <div className="mb-6">
         <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Overrun Percentage</span>
            <span className="font-mono font-bold text-gold-500">+{overrunPercent}%</span>
         </div>
         <Slider 
           value={[overrunPercent]} 
           onValueChange={(vals) => setOverrunPercent(vals[0])}
           max={50} 
           step={5}
           className="cursor-pointer"
         />
         <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-800/50 p-3 rounded-lg">
         <div>
            <p className="text-xs text-gray-500">Original Budget</p>
            <p className="font-mono text-white">${parseFloat(deal.rehab_costs).toLocaleString()}</p>
         </div>
         <div>
            <p className="text-xs text-gray-500">New Budget</p>
            <p className="font-mono text-white">${results.newRehabTotal.toLocaleString()}</p>
         </div>
         <div className="col-span-2 pt-2 border-t border-white/5">
             <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-400">Profit Impact</span>
                 <span className="text-red-400 font-bold">-${Math.abs(results.impact.profit).toLocaleString()}</span>
             </div>
         </div>
      </div>

      {isCritical && (
         <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 p-2 rounded mb-4">
            <AlertTriangle size={14} />
            <span>Warning: This overrun level makes the deal unprofitable.</span>
         </div>
      )}

      <Button 
        size="sm" 
        onClick={() => onSaveScenario({ rehabOverrunPercent: overrunPercent })}
        className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
      >
         <Save size={14} className="mr-2" /> Save as Scenario
      </Button>
    </div>
  );
};

export default RehabCostProjector;
