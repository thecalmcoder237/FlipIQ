
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, ChevronDown, ChevronRight, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const BreakdownSection = ({ title, items, total, color, isOpen, onToggle, totalAllCosts, tooltip }) => {
  const safeTotal = total || 0;
  const percentage = totalAllCosts > 0 ? ((safeTotal / totalAllCosts) * 100).toFixed(1) : 0;
  const titleEl = <span className="font-semibold text-foreground">{title}</span>;

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2 bg-muted/50">
      <div 
        onClick={onToggle}
        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors border-l-4 ${color}`}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help inline-flex items-center gap-1.5">
                  {titleEl}
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs"><p className="text-xs">{tooltip}</p></TooltipContent>
            </Tooltip>
          ) : titleEl}
        </div>
        <div className="flex items-center gap-4">
           <span className="text-xs text-muted-foreground">{percentage}%</span>
           <span className="font-bold text-foreground min-w-[80px] text-right">${safeTotal.toLocaleString()}</span>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: 'auto' }} 
            exit={{ height: 0 }}
            className="bg-background/50 overflow-hidden"
          >
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-4 py-2 text-sm border-t border-border pl-10 hover:bg-accent/50">
                <span className="text-foreground">{item.label}</span>
                <span className="font-mono text-muted-foreground">${(item.value || 0).toLocaleString()}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ComprehensiveFinancialBreakdown = ({ deal, metrics }) => {
  const [openSections, setOpenSections] = useState({
    acquisition: true,
    hardMoney: false,
    rehab: false,
    holding: false,
    selling: false
  });

  const toggle = (sec) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  if (!metrics) return <div className="p-4 text-center text-muted-foreground">Loading breakdown...</div>;

  const {
    acquisition,
    hardMoney,
    rehab,
    holding,
    selling,
    totalProjectCost,
    purchasePrice
  } = metrics;

  // We use totalProjectCost + selling.total as the denominator for percentages to show where every dollar goes
  const totalAllCosts = totalProjectCost + selling.total;

  // Purchase & Acquisition section must sum to purchasePrice + feesOnly to align with totalProjectCost formula:
  // totalProjectCost = purchasePrice + feesOnly + interest + rehab + holding
  const purchaseAndAcquisitionTotal = (purchasePrice || 0) + (acquisition?.feesOnly || 0);
  const acquisitionItems = [
    { label: "Purchase Price", value: purchasePrice || 0 },
    { label: "Loan Points", value: acquisition.hardMoneyPoints },
    { label: "Inspection & Appraisal", value: (acquisition.inspection || 0) + (acquisition.appraisal || 0) },
    { label: "Title & Legal", value: acquisition.titleInsurance },
    { label: "Closing Costs (Buy)", value: acquisition.closingCostsBuying },
    { label: "Transfer Tax", value: acquisition.transferTax },
  ];

  const hardMoneyItems = [
    { label: "Monthly Interest", value: hardMoney.monthlyInterest },
    { label: `Total Interest (${hardMoney.actualHoldingMonths || 0} mos)`, value: hardMoney.totalInterest },
  ];

  const rehabItems = [
    { label: "Base Budget", value: rehab.baseRehab },
    { label: "Contingency", value: rehab.contingency },
    { label: "Overruns", value: rehab.overrun },
    { label: "Permits", value: rehab.permitFees },
  ];

  const totalMonthlySoft = holding.totalMonthlySoft || 1;
  const holdingItems = [
    { label: "Property Taxes", value: totalMonthlySoft > 0 ? holding.totalSoft * ((holding.monthlyTax || 0) / totalMonthlySoft) : 0 },
    { label: "Insurance", value: totalMonthlySoft > 0 ? holding.totalSoft * ((holding.monthlyIns || 0) / totalMonthlySoft) : 0 },
    { label: "Utilities, HOA & Lawn", value: totalMonthlySoft > 0 ? holding.totalSoft * (((holding.monthlyUtil || 0) + (holding.monthlyHoa || 0) + (holding.monthlyLawn || 0)) / totalMonthlySoft) : 0 },
  ];

  const sellingItems = [
    { label: "Realtor Commission", value: selling.realtorCommission },
    { label: "Closing Costs (Sell)", value: selling.closingCostsSelling },
    { label: "Staging & Marketing", value: (selling.staging || 0) + (selling.marketing || 0) },
    { label: "Fallthrough Reserve", value: selling.fallthroughCost },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
         <TooltipProvider delayDuration={300}>
           <Tooltip>
             <TooltipTrigger asChild>
               <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 cursor-help w-fit">
                 <DollarSign className="text-primary" size={18} /> Detailed Cost Breakdown
                 <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
               </h3>
             </TooltipTrigger>
             <TooltipContent side="top" className="max-w-xs">
               <p className="font-semibold">Cost categories</p>
               <p className="text-xs mt-1">Acquisition = cash at closing. Project cost = purchase + fees + interest + rehab + holding. Net profit = ARV − project cost − selling.</p>
             </TooltipContent>
           </Tooltip>

         <BreakdownSection 
           title="Purchase & Acquisition" 
           items={acquisitionItems} 
           total={purchaseAndAcquisitionTotal} 
           color="border-primary" 
           isOpen={openSections.acquisition} 
           onToggle={() => toggle('acquisition')}
           totalAllCosts={totalAllCosts}
           tooltip="Purchase price + acquisition fees (points, inspection, appraisal, title, closing, transfer tax). Sum aligns with Total Project Cost formula."
         />
         <BreakdownSection 
           title="Hard Money Costs" 
           items={hardMoneyItems} 
           total={hardMoney.total} 
           color="border-accentBrand" 
           isOpen={openSections.hardMoney} 
           onToggle={() => toggle('hardMoney')}
           totalAllCosts={totalAllCosts}
           tooltip="Interest on loan: monthly interest × holding months. Formula: Loan Amount × (Rate/100/12) × Months."
         />
         <BreakdownSection 
           title="Rehab Costs" 
           items={rehabItems} 
           total={rehab.total} 
           color="border-green-500"
           isOpen={openSections.rehab} 
           onToggle={() => toggle('rehab')}
           totalAllCosts={totalAllCosts}
           tooltip="Base budget + contingency % + overrun % + permit fees."
         />
         <BreakdownSection 
           title="Holding Costs" 
           items={holdingItems} 
           total={holding.total} 
           color="border-teal-500" 
           isOpen={openSections.holding} 
           onToggle={() => toggle('holding')} 
           totalAllCosts={totalAllCosts}
           tooltip="Monthly costs × holding months: property tax + insurance + utilities + HOA."
         />
         <BreakdownSection 
           title="Selling Costs" 
           items={sellingItems} 
           total={selling.total} 
           color="border-red-500" 
           isOpen={openSections.selling} 
           onToggle={() => toggle('selling')}
           totalAllCosts={totalAllCosts}
           tooltip="Realtor commission + closing (sell) + staging + marketing + fallthrough reserve. Deducted from sale proceeds."
         />
         </TooltipProvider>
      </div>
    </div>
  );
};

export default ComprehensiveFinancialBreakdown;
