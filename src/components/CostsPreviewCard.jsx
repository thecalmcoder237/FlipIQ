
import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react';

const CostsPreviewCard = ({ deal, metrics }) => {
  if (!deal || !metrics) return null;

  const maoConservative = (deal.arv * 0.65) - deal.rehab_costs;
  const maoAggressive = (deal.arv * 0.70) - deal.rehab_costs;
  
  const isGoodDeal = deal.purchase_price <= maoAggressive;

  // Costs Breakdown
  const holdingCosts = (deal.holding_months || 6) * ((deal.utilities || 0) + (deal.insurance || 0) + (deal.property_tax / 12 || 0) + (deal.lawn_maintenance || 0) + (deal.hoa || 0));
  const sellingCosts = (deal.arv * ((deal.realtor_commission || 6) / 100)) + (deal.closing_costs || 0) + (deal.staging_costs || 0);
  const totalCosts = deal.rehab_costs + holdingCosts + sellingCosts + deal.purchase_price;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-xl border border-white/10 p-6 mb-6 shadow-lg"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Costs Breakdown */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
           <div className="bg-slate-900/50 p-3 md:p-4 rounded-lg border border-white/5 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-gold-400">
                 <Briefcase size={16} className="shrink-0" /> <span className="font-bold text-sm md:text-base">Rehab</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-white break-all">${deal.rehab_costs?.toLocaleString()}</p>
              <p className="text-[10px] md:text-xs text-gray-400 mt-1">{deal.rehab_category || 'Custom'} Estimate</p>
           </div>

           <div className="bg-slate-900/50 p-3 md:p-4 rounded-lg border border-white/5 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-blue-400">
                 <Clock size={16} className="shrink-0" /> <span className="font-bold text-sm md:text-base">Holding</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-white break-all">${Math.round(holdingCosts).toLocaleString()}</p>
              <p className="text-[10px] md:text-xs text-gray-400 mt-1">{deal.holding_months} Months Total</p>
           </div>

           <div className="bg-slate-900/50 p-3 md:p-4 rounded-lg border border-white/5 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-purple-400">
                 <DollarSign size={16} className="shrink-0" /> <span className="font-bold text-sm md:text-base">Selling</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-white break-all">${Math.round(sellingCosts).toLocaleString()}</p>
              <p className="text-[10px] md:text-xs text-gray-400 mt-1">Commissions & Closing</p>
           </div>
        </div>

        {/* Right: MAO Analysis */}
        <div className="lg:w-1/3 bg-slate-900 rounded-lg p-3 md:p-4 border border-white/10 flex flex-col justify-center min-w-0">
           <h3 className="text-xs md:text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Max Allowable Offer (MAO)</h3>
           
           <div className="flex justify-between items-center mb-2 gap-2">
              <span className="text-gray-300 text-xs md:text-sm">Conservative (65%)</span>
              <span className="font-mono font-bold text-white text-xs md:text-base break-all">${Math.round(maoConservative).toLocaleString()}</span>
           </div>
           
           <div className="flex justify-between items-center mb-4 gap-2">
              <span className="text-gray-300 text-xs md:text-sm">Aggressive (70%)</span>
              <span className="font-mono font-bold text-gold-400 text-xs md:text-base break-all">${Math.round(maoAggressive).toLocaleString()}</span>
           </div>

           <div className={`p-2 md:p-3 rounded-lg flex items-center gap-2 md:gap-3 ${isGoodDeal ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {isGoodDeal ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
              <div className="text-xs md:text-sm font-bold min-w-0">
                 <div className="break-words">{isGoodDeal ? 'PRICE UNDER MAO' : 'PRICE OVER MAO'}</div>
                 <span className="block text-[10px] md:text-xs font-normal opacity-80 break-words">
                    {isGoodDeal ? `Buffer: $${(maoAggressive - deal.purchase_price).toLocaleString()}` : `Over by: $${(deal.purchase_price - maoAggressive).toLocaleString()}`}
                 </span>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CostsPreviewCard;
