
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, TrendingUp, Star, Edit2, User, Mail, Wallet, Building, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { dealService } from '@/services/dealService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const DealSummaryCard = ({ deal, metrics, onEdit }) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  if (!deal || !metrics) return null;

  const handleToggleFavorite = async () => {
    try {
      const updatedDeal = { ...deal, isFavorite: !deal.isFavorite };
      await dealService.saveDeal(updatedDeal, currentUser.id);
      toast({ title: updatedDeal.isFavorite ? "Added to favorites" : "Removed from favorites" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
    }
  };

  const netProfit = metrics.netProfit || 0;
  const isProfitable = netProfit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8 shadow-lg"
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        
        {/* Address & Status */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-blue-400" size={20} />
            <h1 className="text-2xl font-bold text-white">{deal.address || "Untitled Deal"}</h1>
            {deal.status && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {deal.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-sm">
             <span className="flex items-center gap-1"><DollarSign size={14}/> Purchase: ${metrics.purchasePrice?.toLocaleString()}</span>
             <ArrowRight size={14}/>
             <span className="flex items-center gap-1"><Building size={14}/> ARV: ${metrics.arv?.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
           <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className="text-gray-400 hover:text-gold-400 hover:bg-white/5"
            >
              <Star className={`w-5 h-5 ${deal.isFavorite ? 'fill-gold-400 text-gold-400' : ''}`} />
            </Button>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="border-white/10 hover:bg-white/5 text-gray-300 gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit Inputs
              </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
             <p className="text-xs text-gray-400 uppercase font-bold mb-1">Total Cash Needed</p>
             <div className="text-xl font-bold text-blue-400 flex items-center gap-1">
                <Wallet size={16}/> ${metrics.totalCashInvested?.toLocaleString()}
             </div>
             <p className="text-[10px] text-gray-500 mt-1">Initial Capital + Rehab</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
             <p className="text-xs text-gray-400 uppercase font-bold mb-1">Total Project Cost</p>
             <div className="text-xl font-bold text-purple-400">
                ${metrics.totalProjectCost?.toLocaleString()}
             </div>
             <p className="text-[10px] text-gray-500 mt-1">All Costs (Pre-Sale)</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
             <p className="text-xs text-gray-400 uppercase font-bold mb-1">Gross Profit</p>
             <div className="text-xl font-bold text-yellow-400">
                ${metrics.grossProfit?.toLocaleString()}
             </div>
             <p className="text-[10px] text-gray-500 mt-1">ARV - Project Cost</p>
          </div>

          <div className={`p-3 rounded-lg border ${isProfitable ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
             <p className={`text-xs uppercase font-bold mb-1 ${isProfitable ? 'text-green-300' : 'text-red-300'}`}>Net Profit</p>
             <div className={`text-xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                ${metrics.netProfit?.toLocaleString()}
             </div>
             <p className={`text-[10px] mt-1 ${isProfitable ? 'text-green-500/70' : 'text-red-500/70'}`}>
                After Selling Costs
             </p>
          </div>
      </div>
    </motion.div>
  );
};

export default DealSummaryCard;
