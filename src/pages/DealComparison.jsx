
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Layers, Plus, X, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { dealService } from '@/services/dealService';

const DealComparison = () => {
  const [deals, setDeals] = useState([]);
  const [selectedDealIds, setSelectedDealIds] = useState([]);
  const { currentUser } = useAuth();
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);

  useEffect(() => {
    const fetchDeals = async () => {
      if (!currentUser) return;
      const data = await dealService.loadUserDeals(currentUser.id);
      setDeals(data || []);
    };
    fetchDeals();
  }, [currentUser]);

  const toggleDealSelection = (id) => {
    if (selectedDealIds.includes(id)) {
      setSelectedDealIds(prev => prev.filter(dealId => dealId !== id));
    } else {
      if (selectedDealIds.length < 3) {
        setSelectedDealIds(prev => [...prev, id]);
      }
    }
  };

  const selectedDeals = deals.filter(d => selectedDealIds.includes(d.id)).map(d => ({ ...d, metrics: calculateDealMetrics(d) }));

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <Helmet><title>Deal Comparison | FlipIQ</title></Helmet>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb />
        
        <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-bold text-gray-900">Compare Deals</h1>
           <Button onClick={() => setIsSelectionOpen(!isSelectionOpen)} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
             {isSelectionOpen ? 'Close Selection' : 'Select Deals'}
           </Button>
        </div>

        {/* Selection Area */}
        <motion.div 
           initial={false}
           animate={{ height: isSelectionOpen ? 'auto' : 0, opacity: isSelectionOpen ? 1 : 0 }}
           className="overflow-hidden mb-6"
        >
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {deals.map(deal => (
                <div 
                  key={deal.id}
                  onClick={() => toggleDealSelection(deal.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDealIds.includes(deal.id) 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-gray-900 font-medium text-sm truncate">{deal.address}</p>
                  <p className="text-xs text-gray-600 flex justify-between">
                      <span>{deal.status || 'Analyzing'}</span>
                  </p>
                </div>
              ))}
           </div>
           <p className="text-xs text-gray-600 mt-2 text-right">{selectedDealIds.length}/3 selected</p>
        </motion.div>

        {/* Comparison Table */}
        {selectedDeals.length === 0 ? (
          <div className="text-center py-20 bg-gray-100 rounded-2xl border border-gray-200">
             <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
             <p className="text-gray-600">Select up to 3 deals to compare them side-by-side.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse bg-white rounded-lg shadow-sm">
               <thead>
                 <tr>
                   <th className="p-4 bg-gray-100 sticky left-0 z-10 w-40 border-r border-gray-200">Metric</th>
                   {selectedDeals.map(deal => (
                     <th key={deal.id} className="p-4 bg-gray-50 border-x border-t border-gray-200 min-w-[200px]">
                       <div className="flex justify-between items-start">
                         <span className="text-gray-900 font-bold block mb-1">{deal.address}</span>
                         <button onClick={() => toggleDealSelection(deal.id)} className="text-gray-500 hover:text-gray-900"><X size={14}/></button>
                       </div>
                       <div className="flex flex-col gap-1 mt-1">
                           <span className="text-xs text-gray-600 font-normal">{deal.status}</span>
                       </div>
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                 <ComparisonRow label="Purchase Price" data={selectedDeals} field="purchasePrice" format={(v) => `$${v?.toLocaleString()}`} />
                 <ComparisonRow label="ARV" data={selectedDeals} field="arv" format={(v) => `$${v?.toLocaleString()}`} />
                 <ComparisonRow label="Rehab Costs" data={selectedDeals} field="rehabCosts" format={(v) => `$${v?.toLocaleString()}`} />
                 <ComparisonRow label="Net Profit" data={selectedDeals} field="metrics.netProfit" format={(v) => `$${Math.round(v)?.toLocaleString()}`} highlightMax />
                 <ComparisonRow label="ROI" data={selectedDeals} field="metrics.roi" format={(v) => `${v?.toFixed(2)}%`} highlightMax />
                 <ComparisonRow label="Total Cash Needed" data={selectedDeals} field="metrics.totalCashNeeded" format={(v) => `$${Math.round((v ?? 0)).toLocaleString()}`} highlightMin />
                 <ComparisonRow label="Holding Time" data={selectedDeals} field="holdingMonths" format={(v) => `${v} Months`} />
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

const ComparisonRow = ({ label, data, field, format, highlightMax, highlightMin }) => {
   const values = data.map(d => {
      const keys = field.split('.');
      let val = d;
      keys.forEach(k => val = val ? val[k] : 0);
      return Number(val) || 0;
   });

   const max = Math.max(...values);
   const min = Math.min(...values);

   return (
     <tr className="bg-white hover:bg-gray-50">
       <td className="p-4 text-gray-700 font-medium bg-gray-100 sticky left-0 border-r border-gray-200">{label}</td>
       {values.map((val, i) => {
         const isBest = (highlightMax && val === max) || (highlightMin && val === min);
         return (
           <td key={i} className={`p-4 border-r border-border ${isBest ? 'bg-primary/10' : ''}`}>
             <span className={`font-bold ${isBest ? 'text-primary' : 'text-foreground'}`}>
               {format(val)}
             </span>
             {isBest && <span className="ml-2 text-[10px] bg-primary text-primary-foreground px-1 rounded font-bold">BEST</span>}
           </td>
         );
       })}
     </tr>
   );
};

export default DealComparison;
