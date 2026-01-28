
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Info, DollarSign } from 'lucide-react';
import { calculateCostBreakdown } from '@/utils/projectionCalculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CostBreakdownTable = ({ deal, hiddenCosts }) => {
  const [expandedSections, setExpandedSections] = useState({
    acquisition: false,
    rehab: true,
    holding: false,
    selling: false
  });

  // Safety check for deal
  if (!deal) return null;

  const breakdown = calculateCostBreakdown(deal, hiddenCosts || []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (val) => `$${Math.round(val || 0).toLocaleString()}`;

  const SectionHeader = ({ title, total, sectionKey, color = "text-white" }) => (
    <div 
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 cursor-pointer border-b border-white/5 transition-colors"
    >
      <div className="flex items-center gap-2">
        {expandedSections[sectionKey] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-semibold text-white">{title}</span>
      </div>
      <span className={`font-bold ${color}`}>{formatCurrency(total)}</span>
    </div>
  );

  const SectionItems = ({ items, isOpen }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: 'auto', opacity: 1 }} 
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-slate-900/30"
        >
          {items && items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center px-8 py-2 border-b border-white/5 text-sm">
              <span className="text-gray-400 flex items-center gap-2">
                {item.name}
                {item.note && (
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger><Info size={12} /></TooltipTrigger>
                       <TooltipContent>{item.note}</TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                )}
              </span>
              <span className="text-gray-200 font-mono">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Ensure breakdown properties exist
  const acquisition = breakdown.acquisition || { total: 0, items: [] };
  const rehab = breakdown.rehab || { total: 0, items: [] };
  const holding = breakdown.holding || { total: 0, items: [] };
  const selling = breakdown.selling || { total: 0, items: [] };
  const revenue = breakdown.revenue || { arv: 0 };
  const summary = breakdown.summary || { totalCosts: 0, netProfit: 0, margin: 0 };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 bg-slate-800 border-b border-white/10 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2">
          <DollarSign className="text-gold-500" size={18} /> Detailed Cost Breakdown
        </h3>
        <span className="text-xs text-gray-400">Includes hidden costs</span>
      </div>

      <div className="divide-y divide-white/10">
        <SectionHeader title="Revenue (Projected ARV)" total={revenue.arv} sectionKey="revenue" color="text-green-400" />
        
        <SectionHeader title="Acquisition Costs" total={acquisition.total} sectionKey="acquisition" />
        <SectionItems items={acquisition.items} isOpen={expandedSections.acquisition} />

        <SectionHeader title="Rehab Costs" total={rehab.total} sectionKey="rehab" />
        <SectionItems items={rehab.items} isOpen={expandedSections.rehab} />

        <SectionHeader title="Holding Costs" total={holding.total} sectionKey="holding" />
        <SectionItems items={holding.items} isOpen={expandedSections.holding} />

        <SectionHeader title="Selling Costs" total={selling.total} sectionKey="selling" />
        <SectionItems items={selling.items} isOpen={expandedSections.selling} />
      </div>

      <div className="bg-slate-900 p-4 border-t border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Total All Costs</span>
          <span className="text-red-400 font-bold">{formatCurrency(summary.totalCosts)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-lg font-bold text-white">Net Profit</span>
          <div className="text-right">
             <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                {formatCurrency(summary.netProfit)}
             </div>
             <div className={`text-xs ${summary.margin >= 15 ? 'text-green-500' : summary.margin > 8 ? 'text-yellow-500' : 'text-red-500'}`}>
                {summary.margin.toFixed(1)}% Margin
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostBreakdownTable;
