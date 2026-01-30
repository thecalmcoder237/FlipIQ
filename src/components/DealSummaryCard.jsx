
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, TrendingUp, Star, Edit2, User, Mail, Wallet, Building, ArrowRight, HelpCircle } from 'lucide-react';
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

  // #region agent log
  const _log = (message, data, hypothesisId) => {
    fetch('http://127.0.0.1:7245/ingest/d3874b50-fda2-4990-b7a4-de8818f92f9c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'DealSummaryCard.jsx', message, data: data ?? {}, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId }) }).catch(() => {});
  };
  if (!deal || !metrics) {
    _log('DealSummaryCard: return null', { hasDeal: !!deal, hasMetrics: !!metrics }, 'H5');
    return null;
  }
  _log('DealSummaryCard: rendering', { hasDeal: true, hasMetrics: true }, 'H5');
  // #endregion

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
      className="bg-gradient-to-r from-primary to-primary/90 backdrop-blur-md border border-primary/20 rounded-xl p-6 mb-8 shadow-lg"
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        
        {/* Address & Status */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-primary-foreground" size={20} />
            <h1 className="text-2xl font-bold text-primary-foreground">{deal.address || "Untitled Deal"}</h1>
            {deal.status && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                deal.status === 'Under Contract' ? 'bg-accentBrand/20 text-white border-accentBrand/30' : 'bg-white/20 text-primary-foreground border-white/30'
              }`}>
                {deal.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-primary-foreground text-base font-semibold">
             <span className="flex items-center gap-1.5"><DollarSign size={16}/> Purchase: <span className="font-bold text-orange-400">${metrics.purchasePrice?.toLocaleString()}</span></span>
             <ArrowRight size={16} className="text-primary-foreground/80"/>
             <span className="flex items-center gap-1.5"><Building size={16}/> ARV: <span className="font-bold text-orange-400">${metrics.arv?.toLocaleString()}</span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
           <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            >
              <Star className={`w-5 h-5 ${deal.isFavorite ? 'fill-primary-foreground text-primary-foreground' : ''}`} />
            </Button>
            {onEdit && (
              <Button
                size="sm"
                onClick={onEdit}
                className="bg-accentBrand hover:bg-accentBrand/90 text-white border-0 gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit Inputs
              </Button>
            )}
        </div>
      </div>

      <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/20">
          <div className="p-3 bg-muted rounded-lg border border-border">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1.5">
                   Total Cash Needed <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">Acquisition costs only</p>
                 <p className="text-xs mt-1">Down payment + loan points + inspection + appraisal + title + closing costs (buy) + transfer tax. Cash required at closing.</p>
               </TooltipContent>
             </Tooltip>
             <div className="text-xl font-bold text-foreground flex items-center gap-1">
                <Wallet size={16} className="text-primary"/> ${(metrics.totalCashNeeded ?? metrics.acquisition?.total)?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">Acquisition only (at closing)</p>
          </div>

          <div className="p-3 bg-muted rounded-lg border border-border">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1.5">
                   Total Project Cost <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">All pre-sale costs</p>
                 <p className="text-xs mt-1">Purchase price + acquisition fees + interest + rehab + holding (tax, insurance, utilities). Does not include selling costs.</p>
               </TooltipContent>
             </Tooltip>
             <div className="text-xl font-bold text-foreground">
                ${metrics.totalProjectCost?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">All Costs (Pre-Sale)</p>
          </div>

          <div className="p-3 bg-muted rounded-lg border border-border">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1.5">
                   Gross Profit <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">Before selling costs</p>
                 <p className="text-xs mt-1">Formula: ARV − Total Project Cost</p>
               </TooltipContent>
             </Tooltip>
             <div className="text-xl font-bold text-foreground">
                ${metrics.grossProfit?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">ARV − Project Cost</p>
          </div>

          <div className="p-3 bg-muted rounded-lg border border-border">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1.5">
                   Net Profit <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">After selling costs</p>
                 <p className="text-xs mt-1">Formula: Gross Profit − Selling Costs (realtor commission, closing, staging, marketing).</p>
               </TooltipContent>
             </Tooltip>
             <div className={`text-xl font-bold ${isProfitable ? 'text-green-600' : 'text-destructive'}`}>
                ${metrics.netProfit?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">
                After Selling Costs
             </p>
          </div>
      </div>
      </TooltipProvider>
    </motion.div>
  );
};

export default DealSummaryCard;
