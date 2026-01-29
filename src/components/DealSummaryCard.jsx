
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
             <span className="flex items-center gap-1.5"><DollarSign size={16}/> Purchase: <span className="font-bold">${metrics.purchasePrice?.toLocaleString()}</span></span>
             <ArrowRight size={16} className="text-primary-foreground/80"/>
             <span className="flex items-center gap-1.5"><Building size={16}/> ARV: <span className="font-bold">${metrics.arv?.toLocaleString()}</span></span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/20">
          <div className="p-3 bg-muted rounded-lg border border-border">
             <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Cash Needed</p>
             <div className="text-xl font-bold text-foreground flex items-center gap-1">
                <Wallet size={16} className="text-primary"/> ${metrics.totalCashInvested?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">Initial Capital + Rehab</p>
          </div>

          <div className="p-3 bg-muted rounded-lg border border-border">
             <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Project Cost</p>
             <div className="text-xl font-bold text-foreground">
                ${metrics.totalProjectCost?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">All Costs (Pre-Sale)</p>
          </div>

          <div className="p-3 bg-muted rounded-lg border border-border">
             <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Gross Profit</p>
             <div className="text-xl font-bold text-foreground">
                ${metrics.grossProfit?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">ARV - Project Cost</p>
          </div>

          <div className="p-3 bg-muted rounded-lg border border-border">
             <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Net Profit</p>
             <div className={`text-xl font-bold ${isProfitable ? 'text-green-600' : 'text-destructive'}`}>
                ${metrics.netProfit?.toLocaleString()}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">
                After Selling Costs
             </p>
          </div>
      </div>
    </motion.div>
  );
};

export default DealSummaryCard;
