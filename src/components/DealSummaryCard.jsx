
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, TrendingUp, Star, Edit2, User, Mail, Wallet, Building, ArrowRight, HelpCircle, Phone, CheckCircle, Banknote } from 'lucide-react';
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

const DealSummaryCard = ({ deal, metrics, onEdit, readOnly }) => {
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
      className="bg-gradient-to-r from-primary to-primary/90 backdrop-blur-md border border-primary/20 rounded-xl p-6 mb-8 shadow-lg"
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        
        {/* Address & Status */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <MapPin className="text-primary-foreground" size={20} />
            <h1 className="text-2xl font-bold text-primary-foreground">{deal.address || "Untitled Deal"}</h1>
            {deal.status && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                deal.status === 'Under Contract' ? 'bg-accentBrand/20 text-white border-accentBrand/30' : 'bg-white/20 text-primary-foreground border-white/30'
              }`}>
                {deal.status}
              </span>
            )}
            {(deal.isClosed || deal.status === 'Closed' || deal.status === 'Completed') && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-white/20 text-primary-foreground border-white/30 flex items-center gap-1">
                <CheckCircle size={12} /> Closed
              </span>
            )}
            {(deal.isFunded || deal.status === 'Funded') && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-white/20 text-primary-foreground border-white/30 flex items-center gap-1">
                <Banknote size={12} /> Funded
              </span>
            )}
          </div>
          {deal.fundedTerms && (
            <p className="text-sm text-primary-foreground/90 mb-2">Funded terms: {deal.fundedTerms}</p>
          )}
          <div className="flex items-center gap-4 text-primary-foreground text-base font-semibold">
             <span className="flex items-center gap-1.5"><DollarSign size={16}/> Purchase: <span className="font-bold text-white text-xl">${metrics.purchasePrice?.toLocaleString()}</span></span>
             <ArrowRight size={16} className="text-primary-foreground/80"/>
             <span className="flex items-center gap-1.5"><Building size={16}/> ARV: <span className="font-bold text-white text-xl">${metrics.arv?.toLocaleString()}</span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
           {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            >
              <Star className={`w-5 h-5 ${deal.isFavorite ? 'fill-primary-foreground text-primary-foreground' : ''}`} />
            </Button>
           )}
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

      {/* Additional info: Funding & Contact (when present) */}
      {(deal.amountApproved != null || deal.dealAgentName || deal.dealAgentPhone || deal.dealAgentEmail) && (
        <div className="mt-6 pt-6 border-t border-primary/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(deal.amountApproved != null || deal.ltvPercent != null || deal.fundingRatePercent != null || deal.fundingSource) && (
            <div className="p-3 bg-white/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary-foreground/80 uppercase font-bold mb-2 flex items-center gap-1"><Banknote size={12} /> Funding</p>
              <div className="text-sm text-primary-foreground space-y-1">
                {deal.amountApproved != null && deal.amountApproved !== '' && <p>Amount approved: ${Number(deal.amountApproved).toLocaleString()}</p>}
                {deal.ltvPercent != null && deal.ltvPercent !== '' && <p>LTV: {deal.ltvPercent}%</p>}
                {deal.fundingRatePercent != null && deal.fundingRatePercent !== '' && <p>Rate: {deal.fundingRatePercent}%</p>}
                {deal.fundingTermMonths != null && deal.fundingTermMonths !== '' && <p>Term: {deal.fundingTermMonths} months</p>}
                {deal.fundingSource && <p>Source: {deal.fundingSource}</p>}
              </div>
            </div>
          )}
          {(deal.dealAgentName || deal.dealAgentPhone || deal.dealAgentEmail) && (
            <div className="p-3 bg-white/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary-foreground/80 uppercase font-bold mb-2 flex items-center gap-1"><User size={12} /> Contact / source</p>
              <div className="text-sm text-primary-foreground space-y-1">
                {deal.dealAgentName && <p className="font-medium">{deal.dealAgentName}</p>}
                {deal.dealSourceType && <p className="text-primary-foreground/80">{deal.dealSourceType}</p>}
                {deal.dealAgentPhone && <p className="flex items-center gap-1"><Phone size={12} /> {deal.dealAgentPhone}</p>}
                {deal.dealAgentEmail && <p className="flex items-center gap-1"><Mail size={12} /> {deal.dealAgentEmail}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default DealSummaryCard;
