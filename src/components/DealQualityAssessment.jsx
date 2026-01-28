
import React from 'react';
import { Award, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const Gauge = ({ score }) => {
  const safeScore = isNaN(score) ? 0 : score;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;
  
  let color = "stroke-red-500";
  if (safeScore >= 80) color = "stroke-green-500";
  else if (safeScore >= 65) color = "stroke-green-400";
  else if (safeScore >= 50) color = "stroke-yellow-500";

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
       <svg className="w-full h-full transform -rotate-90">
         <circle cx="64" cy="64" r={radius} className="fill-none stroke-slate-700" strokeWidth="8" />
         <circle 
            cx="64" cy="64" r={radius} 
            className={`fill-none ${color} transition-all duration-1000 ease-out`} 
            strokeWidth="8" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset}
            strokeLinecap="round"
         />
       </svg>
       <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(safeScore)}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Score</span>
       </div>
    </div>
  );
};

const ChecklistItem = ({ label, passed }) => (
  <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
     <span className="text-sm text-gray-400">{label}</span>
     {passed ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
  </div>
);

const RiskMeter = ({ risk }) => {
    const levels = { "Low": 1, "Medium": 2, "High": 3 };
    const current = levels[risk] || 2;
    
    return (
        <div className="mt-4">
           <div className="flex justify-between text-xs mb-1 uppercase text-gray-500">
               <span>Low</span><span>Med</span><span>High</span>
           </div>
           <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
               <div className={`flex-1 ${current >= 1 ? 'bg-green-500' : 'bg-slate-700'} opacity-${current === 1 ? '100' : '40'}`}></div>
               <div className={`flex-1 ${current >= 2 ? 'bg-yellow-500' : 'bg-slate-700'} opacity-${current === 2 ? '100' : '40'}`}></div>
               <div className={`flex-1 ${current >= 3 ? 'bg-red-500' : 'bg-slate-700'} opacity-${current === 3 ? '100' : '40'}`}></div>
           </div>
           <p className="text-center mt-2 text-sm font-bold text-white">Risk Level: <span className={risk === 'Low' ? 'text-green-400' : risk === 'High' ? 'text-red-400' : 'text-yellow-400'}>{risk || 'Medium'}</span></p>
        </div>
    );
};

const DealQualityAssessment = ({ metrics }) => {
  if (!metrics) return null;

  // Defensive destructuring with default values
  const acquisitionTotal = metrics.acquisition?.total || 0;
  const rehabBaseBudget = metrics.rehab?.baseBudget || 0;
  const rehabTotal = metrics.rehab?.total || 0;
  const arv = metrics.arv || 0;
  const roi = metrics.roi || 0;
  const profitMargin = metrics.profitMargin || 0;
  const holdingMonths = metrics.holdingMonths || 0;
  const cashAsPercentOfArv = metrics.cashAsPercentOfArv || 0;
  const score = metrics.score || 0;
  const risk = metrics.risk || "Medium";

  const scoreLabel = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Poor";

  // Checkmarks
  const checks = [
     { label: "70% Rule", passed: (acquisitionTotal + rehabBaseBudget) < (arv * 0.7) },
     { label: "Min ROI 20%", passed: roi >= 20 },
     { label: "Profit Margin 15%", passed: profitMargin >= 15 },
     { label: "Holding ≤ 6mo", passed: holdingMonths <= 6 },
     { label: "Cash < 30% ARV", passed: cashAsPercentOfArv < 30 },
     { label: "Rehab ≤ 30% ARV", passed: arv > 0 ? (rehabTotal / arv) <= 0.3 : false }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/50 p-6 rounded-xl border border-white/10">
       {/* Score Section */}
       <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Award size={18} className="text-gold-500" /> Deal Score</h3>
          <Gauge score={score} />
          <p className="text-xl font-bold text-white mt-2">{scoreLabel}</p>
          <p className="text-xs text-center text-gray-500 mt-2 px-4">
             Weighted score based on ROI, margin, timeline, and risk factors.
          </p>
       </div>

       {/* Checklist Section */}
       <div className="border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 px-0 md:px-6">
          <h3 className="text-white font-bold mb-4">Benchmarks</h3>
          <div className="space-y-1">
             {checks.map((c, i) => <ChecklistItem key={i} {...c} />)}
          </div>
       </div>

       {/* Risk Section */}
       <div className="px-0 md:px-6">
          <h3 className="text-white font-bold mb-4">Risk Profile</h3>
          <RiskMeter risk={risk} />
          
          <div className="mt-4 space-y-2">
             <div className="bg-slate-800/50 p-2 rounded text-xs text-gray-400">
                <span className="block text-white font-semibold mb-1">Risk Factors:</span>
                <ul className="list-disc pl-4 space-y-1">
                   {holdingMonths > 6 && <li>Extended Timeline</li>}
                   {cashAsPercentOfArv > 30 && <li>High Cash Requirement</li>}
                   {arv > 0 && (rehabTotal / arv) > 0.3 && <li>Heavy Rehab</li>}
                   {profitMargin < 12 && <li>Thin Margins</li>}
                   {holdingMonths <= 6 && profitMargin >= 15 && <li>No major flags detected</li>}
                </ul>
             </div>
          </div>
       </div>
    </div>
  );
};

export default DealQualityAssessment;
