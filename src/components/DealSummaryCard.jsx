
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, TrendingUp, Star, Edit2, User, Mail, Wallet, Building, ArrowRight, HelpCircle, Phone, CheckCircle, Banknote, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { dealService } from '@/services/dealService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DealSummaryCard = ({ deal, metrics, onEdit, onDealUpdate, readOnly }) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  if (!deal || !metrics) return null;

  const handleToggleFavorite = async () => {
    try {
      const saved = await dealService.updateDealFields(deal.id, { isFavorite: !deal.isFavorite }, currentUser.id);
      toast({ title: !deal.isFavorite ? "Added to favorites" : "Removed from favorites" });
      onDealUpdate?.(saved);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update favorite" });
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const saved = await dealService.updateDealFields(deal.id, { status: newStatus }, currentUser.id);
      toast({ title: "Status updated", description: `Deal marked as ${newStatus}.` });
      onDealUpdate?.(saved);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-primary-foreground text-sm md:text-base font-semibold">
             <span className="flex items-center gap-1.5 text-xs md:text-base"><DollarSign size={16}/> Purchase: <span className="font-bold text-white text-base md:text-xl break-all">${metrics.purchasePrice?.toLocaleString()}</span></span>
             <ArrowRight size={16} className="text-primary-foreground/80 hidden sm:block"/>
             <span className="flex items-center gap-1.5 text-xs md:text-base"><Building size={16}/> ARV: <span className="font-bold text-white text-base md:text-xl break-all">${metrics.arv?.toLocaleString()}</span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
           {!readOnly && (
             <Select value={deal.status || 'Analyzing'} onValueChange={handleStatusChange}>
               <SelectTrigger className="h-8 w-auto gap-1.5 px-2.5 bg-white/15 hover:bg-white/25 border-white/30 text-white text-xs font-medium focus:ring-0 focus:ring-offset-0">
                 <Tag className="w-3.5 h-3.5 shrink-0" />
                 <SelectValue />
               </SelectTrigger>
               <SelectContent align="end" className="bg-card border-border text-foreground">
                 <SelectItem value="Analyzing">Analyzing</SelectItem>
                 <SelectItem value="Under Contract">Under Contract</SelectItem>
                 <SelectItem value="Funded">Funded</SelectItem>
                 <SelectItem value="Closed">Closed</SelectItem>
                 <SelectItem value="Completed">Completed</SelectItem>
                 <SelectItem value="Passed">Passed</SelectItem>
               </SelectContent>
             </Select>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-6 pt-6 border-t border-primary/20">
          <div className="p-2 md:p-3 bg-muted rounded-lg border border-border min-w-0">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1 flex-wrap">
                   <span className="whitespace-nowrap">Total Cash Needed</span> <HelpCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">Acquisition costs only</p>
                 <p className="text-xs mt-1">Down payment + loan points + inspection + appraisal + title + closing costs (buy) + transfer tax. Cash required at closing.</p>
               </TooltipContent>
             </Tooltip>
             <div className="text-sm md:text-xl font-bold text-foreground flex items-center gap-1 break-all">
                <Wallet size={14} className="text-primary shrink-0"/> <span className="break-all">${(metrics.totalCashNeeded ?? metrics.acquisition?.total)?.toLocaleString()}</span>
             </div>
             <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">Acquisition only (at closing)</p>
          </div>

          <div className="p-2 md:p-3 bg-muted rounded-lg border border-border min-w-0">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1 flex-wrap">
                   <span className="whitespace-nowrap">Total Project Cost</span> <HelpCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">All pre-sale costs</p>
                 <p className="text-xs mt-1">Purchase price + acquisition fees + interest + rehab + holding (tax, insurance, utilities). Does not include selling costs.</p>
               </TooltipContent>
             </Tooltip>
             <div className="text-sm md:text-xl font-bold text-foreground break-all">
                ${metrics.totalProjectCost?.toLocaleString()}
             </div>
             <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">All Costs (Pre-Sale)</p>
          </div>

          <div className="p-2 md:p-3 bg-muted rounded-lg border border-border min-w-0">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1 flex-wrap">
                   <span className="whitespace-nowrap">Gross Profit</span> <HelpCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">Before selling costs</p>
                 <p className="text-xs mt-1">Formula: ARV − Total Project Cost</p>
               </TooltipContent>
             </Tooltip>
             <div className="text-sm md:text-xl font-bold text-foreground break-all">
                ${metrics.grossProfit?.toLocaleString()}
             </div>
             <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">ARV − Project Cost</p>
          </div>

          <div className="p-2 md:p-3 bg-muted rounded-lg border border-border min-w-0">
             <Tooltip>
               <TooltipTrigger asChild>
                 <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold mb-1 cursor-help inline-flex items-center gap-1 flex-wrap">
                   <span className="whitespace-nowrap">Net Profit</span> <HelpCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground shrink-0" aria-hidden />
                 </p>
               </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="font-semibold">After selling costs</p>
                 <p className="text-xs mt-1">Formula: Gross Profit − Selling Costs (realtor commission, closing, staging, marketing).</p>
               </TooltipContent>
             </Tooltip>
             <div className={`text-sm md:text-xl font-bold break-all ${isProfitable ? 'text-green-600' : 'text-destructive'}`}>
                ${metrics.netProfit?.toLocaleString()}
             </div>
             <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">
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
