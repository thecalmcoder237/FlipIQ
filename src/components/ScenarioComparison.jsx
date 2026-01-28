
import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const MetricDiff = ({ label, base, current, format = 'currency', inverse = false }) => {
  const diff = current - base;
  const isZero = diff === 0;
  
  // Logic: 
  // Normally higher is better (Profit, ROI) -> Green if positive.
  // Inverse: higher is worse (Costs) -> Red if positive.
  
  let isGood = inverse ? diff < 0 : diff > 0;
  let color = isZero ? "text-gray-400" : isGood ? "text-green-400" : "text-red-400";
  let Icon = isZero ? null : isGood ? TrendingUp : TrendingDown;
  
  // If inverse (e.g. costs), TrendingUp usually means "Increase", which is bad visually if we use same icon logic
  // but let's stick to color for sentiment.
  
  const fmt = (val) => {
    if (format === 'currency') return `$${Math.round(val).toLocaleString()}`;
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val;
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
       <span className="text-sm text-gray-400">{label}</span>
       <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-gray-500 line-through decoration-white/20">{fmt(base)}</span>
          <ArrowRight size={12} className="text-gray-600" />
          <span className={`text-sm font-bold font-mono ${color} flex items-center gap-1`}>
             {fmt(current)}
             {diff !== 0 && (inverse ? (diff > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>) : (diff > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>))}
          </span>
       </div>
    </div>
  );
};

const ScenarioComparison = ({ baseMetrics, scenarioMetrics, scenarioName }) => {
  if (!baseMetrics || !scenarioMetrics) return null;

  const isUnprofitable = scenarioMetrics.netProfit < 0;
  
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-6 mt-6">
       <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          Scenario Impact Analysis: <span className="text-purple-400 uppercase tracking-wider text-sm border border-purple-500/30 px-2 py-0.5 rounded bg-purple-900/20">{scenarioName}</span>
       </h3>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-950/30 p-4 rounded-lg">
             <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Financial Impact</h4>
             <MetricDiff label="Total Project Cost" base={baseMetrics.totalProjectCost} current={scenarioMetrics.totalProjectCost} inverse={true} />
             <MetricDiff label="Net Profit" base={baseMetrics.netProfit} current={scenarioMetrics.netProfit} />
             <MetricDiff label="ROI" base={baseMetrics.roi} current={scenarioMetrics.roi} format="percent" />
          </div>
          
          <div className="bg-slate-950/30 p-4 rounded-lg">
             <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Risk & Quality</h4>
             <MetricDiff label="Deal Score" base={baseMetrics.score} current={scenarioMetrics.score} format="number" />
             <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-gray-400">Risk Level</span>
                <div className="flex items-center gap-2">
                   <span className="text-gray-500 text-sm">{baseMetrics.risk}</span>
                   <ArrowRight size={12} />
                   <span className={`text-sm font-bold ${scenarioMetrics.risk === 'High' ? 'text-red-400' : 'text-green-400'}`}>
                      {scenarioMetrics.risk}
                   </span>
                </div>
             </div>
          </div>
       </div>

       {isUnprofitable && (
          <div className="mt-4 bg-red-900/20 border border-red-500/50 p-3 rounded flex items-center gap-3 text-red-200">
             <AlertTriangle className="text-red-500" />
             <span className="font-bold text-sm">Warning: This scenario makes the deal unprofitable!</span>
          </div>
       )}
    </div>
  );
};

export default ScenarioComparison;
