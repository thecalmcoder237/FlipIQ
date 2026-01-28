
import React from 'react';
import { simulateWorstCase } from '@/utils/advancedDealCalculations';
import { ShieldAlert } from 'lucide-react';

const WorstCaseScenarios = ({ deal, metrics }) => {
  const scenarios = simulateWorstCase(deal, metrics);

  const ScenarioRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
      <span className="text-gray-300">{label}</span>
      <span className={`font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        ${Math.round(value).toLocaleString()}
      </span>
    </div>
  );

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="w-6 h-6 text-red-400" />
        <h3 className="text-xl font-bold text-white">Disaster Scenarios</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-4">
        Does the deal still make money if things go wrong?
      </p>

      <div className="space-y-1">
        <ScenarioRow label="20% Market Crash" value={scenarios.marketCrash} />
        <ScenarioRow label="Major Repair (+$20k)" value={scenarios.majorRepair} />
        <ScenarioRow label="6 Month Delay" value={scenarios.extendedTimeline} />
        <ScenarioRow label="Financing Fall-through" value={scenarios.financingFallthrough} />
      </div>
    </div>
  );
};

export default WorstCaseScenarios;
