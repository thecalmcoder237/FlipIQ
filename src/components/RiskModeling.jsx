
import React, { useState, useEffect } from 'react';
import { simulateRiskScenarios } from '@/utils/advancedDealCalculations';
import { AlertTriangle } from 'lucide-react';

const RiskModeling = ({ deal, metrics }) => {
  const [permitDelay, setPermitDelay] = useState(0);
  const [marketDecline, setMarketDecline] = useState(0);
  const [rehabOverrun, setRehabOverrun] = useState(0);
  const [simulation, setSimulation] = useState(null);

  useEffect(() => {
    const sim = simulateRiskScenarios(deal, metrics, permitDelay, marketDecline, rehabOverrun);
    setSimulation(sim);
  }, [deal, metrics, permitDelay, marketDecline, rehabOverrun]);

  if (!simulation) return null;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="w-6 h-6 text-red-400" />
        <h3 className="text-xl font-bold text-white">Interactive Risk Modeling</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-300">Permit/Inspection Delay</label>
              <span className="text-gold-400 font-bold">{permitDelay} Months</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              value={permitDelay}
              onChange={(e) => setPermitDelay(Number(e.target.value))}
              className="w-full accent-gold-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-300">Market Decline</label>
              <span className="text-gold-400 font-bold">{marketDecline}%</span>
            </div>
            <select
              value={marketDecline}
              onChange={(e) => setMarketDecline(Number(e.target.value))}
              className="w-full bg-slate-800 border border-white/20 rounded-lg p-2 text-white"
            >
              <option value="0">Stable Market (0%)</option>
              <option value="5">Soft Market (-5%)</option>
              <option value="10">Correction (-10%)</option>
              <option value="20">Crash (-20%)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-300">Rehab Cost Overrun</label>
              <span className="text-gold-400 font-bold">{rehabOverrun}%</span>
            </div>
            <div className="flex gap-2">
              {[0, 10, 15, 20].map((val) => (
                <button
                  key={val}
                  onClick={() => setRehabOverrun(val)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    rehabOverrun === val ? 'bg-gold-500 text-white' : 'bg-slate-800 text-gray-400'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 flex flex-col justify-center">
          <h4 className="text-gray-400 mb-4 text-center">Projected Profit Impact</h4>
          
          <div className="flex justify-between items-end mb-4 px-4">
            <div className="text-center">
              <span className="block text-gray-500 text-sm mb-1">Original</span>
              <span className="text-xl font-bold text-gray-300">${metrics.netProfit.toLocaleString()}</span>
            </div>
            <div className="text-2xl text-gray-600">→</div>
            <div className="text-center">
              <span className="block text-gold-400 text-sm mb-1 font-bold">Simulated</span>
              <span className={`text-2xl font-bold ${simulation.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${Math.round(simulation.profit).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Profit Loss:</span>
              <span className="text-red-400 font-bold">-${Math.round(simulation.impact).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskModeling;
