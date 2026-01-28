
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { projectionService } from '@/services/projectionService';
import { calculateScenarioResults } from '@/utils/projectionCalculations';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ScenarioManager = ({ deal, hiddenCostsTotal }) => {
  const [scenarios, setScenarios] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadScenarios();
  }, [deal.id]);

  const loadScenarios = async () => {
    const data = await projectionService.getScenarios(deal.id);
    if (data && data.length > 0) {
       setScenarios(data);
    } else {
       // Generate defaults if none exist
       generateDefaultScenarios();
    }
  };

  const generateDefaultScenarios = () => {
     // Base Case
     const base = calculateScenarioResults(deal, {}, hiddenCostsTotal);
     // Best Case
     const best = calculateScenarioResults(deal, { arvShiftPercent: 5, holdingMonthAdjustment: -1 }, hiddenCostsTotal);
     // Worst Case
     const worst = calculateScenarioResults(deal, { rehabOverrunPercent: 20, holdingMonthAdjustment: 3, arvShiftPercent: -5 }, hiddenCostsTotal);
     
     setScenarios([
        { name: 'Base', ...base, fill: '#3b82f6' },
        { name: 'Best Case', ...best, fill: '#10b981' },
        { name: 'Worst Case', ...worst, fill: '#ef4444' }
     ]);
  };

  const data = scenarios.map(s => ({
     name: s.name,
     Profit: s.netProfit,
     Costs: s.totalProjectedCosts,
     Revenue: s.newARV || s.revenue // handle diff structures
  }));

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
         <h3 className="font-bold text-white text-lg">Scenario Stress Test</h3>
         <Button variant="outline" size="sm" onClick={generateDefaultScenarios} className="border-white/10 text-gray-400">
            <RefreshCw size={14} className="mr-2" /> Reset
         </Button>
      </div>

      <div className="h-[300px] w-full">
         <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
               <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
               <XAxis dataKey="name" stroke="#94a3b8" />
               <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} />
               <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #333'}}
                  formatter={(value) => `$${value.toLocaleString()}`}
               />
               <Legend />
               <Bar dataKey="Revenue" fill="#10b981" name="Projected Revenue" />
               <Bar dataKey="Costs" fill="#ef4444" name="Total Costs" />
               <Bar dataKey="Profit" fill="#fbbf24" name="Net Profit" />
            </BarChart>
         </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
         {scenarios.map((s, i) => (
            <div key={i} className="bg-slate-800/30 p-4 rounded-lg border border-white/5 text-center">
               <p className="text-gray-400 text-sm mb-1">{s.name}</p>
               <p className={`text-xl font-bold ${s.netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.round(s.netProfit).toLocaleString()}
               </p>
               <p className="text-xs text-gray-500 mt-1">ROI: {s.roi?.toFixed(1)}%</p>
            </div>
         ))}
      </div>
    </div>
  );
};

export default ScenarioManager;
