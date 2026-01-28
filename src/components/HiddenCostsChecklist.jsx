
import React, { useState, useEffect } from 'react';
import { ClipboardCheck } from 'lucide-react';

const HiddenCostsChecklist = ({ metrics }) => {
  const [items, setItems] = useState({
    mold: { label: "Mold / Asbestos", cost: 5000, checked: false },
    structural: { label: "Structural Issues", cost: 8000, checked: false },
    foundation: { label: "Foundation Repair", cost: 10000, checked: false },
    roof: { label: "Roof Replacement", cost: 7500, checked: false },
    electrical: { label: "Electrical Rewire", cost: 4000, checked: false },
    plumbing: { label: "Plumbing Re-pipe", cost: 5000, checked: false },
    sewer: { label: "Sewer Line Collapse", cost: 6000, checked: false },
  });

  const [totalHiddenCosts, setTotalHiddenCosts] = useState(0);

  useEffect(() => {
    const total = Object.values(items).reduce((acc, item) => item.checked ? acc + item.cost : acc, 0);
    setTotalHiddenCosts(total);
  }, [items]);

  const toggleItem = (key) => {
    setItems(prev => ({
      ...prev,
      [key]: { ...prev[key], checked: !prev[key].checked }
    }));
  };

  const adjustedProfit = metrics.netProfit - totalHiddenCosts;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 h-full">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-6 h-6 text-gold-400" />
        <h3 className="text-xl font-bold text-white">Hidden Costs Checklist</h3>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {Object.entries(items).map(([key, item]) => (
          <div 
            key={key}
            onClick={() => toggleItem(key)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
              item.checked ? 'bg-red-500/20 border-red-500/50' : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border flex items-center justify-center ${item.checked ? 'bg-red-500 border-red-500' : 'border-gray-500'}`}>
                {item.checked && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-gray-300">{item.label}</span>
            </div>
            <span className="text-gray-400 text-sm">-${item.cost.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Total Hidden Costs:</span>
          <span className="text-red-400 font-bold">-${totalHiddenCosts.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white font-bold">Adjusted Profit:</span>
          <span className={`text-xl font-bold ${adjustedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${adjustedProfit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HiddenCostsChecklist;
