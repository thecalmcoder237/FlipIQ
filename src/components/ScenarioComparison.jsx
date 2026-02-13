
import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const MetricDiff = ({ label, base, current, format = 'currency', inverse = false }) => {
  const diff = current - base;
  const isZero = diff === 0;
  
  let isGood = inverse ? diff < 0 : diff > 0;
  let color = isZero ? "text-muted-foreground" : isGood ? "text-green-600" : "text-destructive";
  let Icon = isZero ? null : isGood ? TrendingUp : TrendingDown;
  
  const fmt = (val) => {
    if (format === 'currency') return `$${Math.round(val).toLocaleString()}`;
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val;
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0 gap-2">
       <span className="text-xs md:text-sm text-muted-foreground break-words flex-shrink-0 min-w-0">{label}</span>
       <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
          <span className="text-[10px] md:text-sm font-mono text-muted-foreground line-through decoration-muted-foreground/40 whitespace-nowrap">{fmt(base)}</span>
          <ArrowRight size={10} className="text-muted-foreground hidden sm:block" />
          <span className={`text-xs md:text-sm font-bold font-mono ${color} flex items-center gap-1 whitespace-nowrap`}>
             {fmt(current)}
             {diff !== 0 && (inverse ? (diff > 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>) : (diff > 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>))}
          </span>
       </div>
    </div>
  );
};

const ScenarioComparison = ({ baseMetrics, scenarioMetrics, scenarioName }) => {
  if (!baseMetrics || !scenarioMetrics) return null;

  const isUnprofitable = scenarioMetrics.netProfit < 0;
  
  return (
    <div className="bg-card border border-border rounded-xl p-3 md:p-6 mt-6 shadow-sm">
       <h3 className="text-base md:text-lg font-bold text-foreground mb-3 md:mb-4 flex flex-wrap items-center gap-2">
          <span className="break-words">Scenario Impact Analysis:</span> <span className="text-primary uppercase tracking-wider text-xs md:text-sm border border-primary/30 px-2 py-0.5 rounded bg-primary/10 whitespace-nowrap">{scenarioName}</span>
       </h3>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="bg-muted/50 p-3 md:p-4 rounded-lg border border-border min-w-0">
             <h4 className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase mb-2 md:mb-3">Financial Impact</h4>
             <MetricDiff label="Total Project Cost" base={baseMetrics.totalProjectCost} current={scenarioMetrics.totalProjectCost} inverse={true} />
             <MetricDiff label="Net Profit" base={baseMetrics.netProfit} current={scenarioMetrics.netProfit} />
             <MetricDiff label="ROI" base={baseMetrics.roi} current={scenarioMetrics.roi} format="percent" />
          </div>
          
          <div className="bg-muted/50 p-3 md:p-4 rounded-lg border border-border min-w-0">
             <h4 className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase mb-2 md:mb-3">Risk & Quality</h4>
             <MetricDiff label="Deal Score" base={baseMetrics.score} current={scenarioMetrics.score} format="number" />
             <div className="flex justify-between items-center py-2 border-b border-border gap-2">
                <span className="text-xs md:text-sm text-muted-foreground">Risk Level</span>
                <div className="flex items-center gap-1 md:gap-2">
                   <span className="text-muted-foreground text-xs md:text-sm">{baseMetrics.risk}</span>
                   <ArrowRight size={10} className="text-muted-foreground hidden sm:block" />
                   <span className={`text-xs md:text-sm font-bold ${scenarioMetrics.risk === 'High' ? 'text-destructive' : 'text-green-600'}`}>
                      {scenarioMetrics.risk}
                   </span>
                </div>
             </div>
          </div>
       </div>

       {isUnprofitable && (
          <div className="mt-3 md:mt-4 bg-destructive/10 border border-destructive/30 p-2 md:p-3 rounded-lg flex items-center gap-2 md:gap-3 text-destructive">
             <AlertTriangle className="shrink-0" size={16} />
             <span className="font-bold text-xs md:text-sm">Warning: This scenario makes the deal unprofitable!</span>
          </div>
       )}
    </div>
  );
};

export default ScenarioComparison;
