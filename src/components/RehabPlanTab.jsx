
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hammer, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoUploadSection from '@/components/PhotoUploadSection';
import RehabBudgetReport from '@/components/RehabBudgetReport';
import RehabSOWSection from '@/components/RehabSOWSection';
import SOWBudgetComparison from '@/components/SOWBudgetComparison';
import AdvancedAnalysisModal from '@/components/AdvancedAnalysisModal';
import CompsDisplay from '@/components/CompsDisplay';
import { useToast } from '@/components/ui/use-toast';

const RehabPlanTab = ({ deal, setDeal, isHighPotential, inputs, calculations, propertyData, onSowGenerated }) => {
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const { toast } = useToast();

  const handleAnalysisComplete = (details) => {
    setDeal(prev => ({ ...prev, property_details: details }));
    toast({ title: "Analysis Integrated", description: "Rehab plan updated with AI insights." });
  };

  const handlePhotosUpdated = (newPhotos) => {
    setDeal(prev => ({ ...prev, photos: newPhotos }));
  };
  
  const handleBudgetGenerated = (budget) => {
      setDeal(prev => ({ ...prev, rehab_budget: budget }));
  };

  if (!isHighPotential && !deal.property_details) {
     return (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-border text-center px-4 shadow-sm">
           <div className="bg-muted p-6 rounded-full mb-6 relative">
              <Lock className="w-12 h-12 text-muted-foreground" />
              <div className="absolute top-0 right-0 bg-primary p-1 rounded-full"><Sparkles size={12} className="text-primary-foreground"/></div>
           </div>
           <h3 className="text-2xl font-bold text-foreground mb-2">Advanced Analysis Locked</h3>
           <p className="text-muted-foreground max-w-md mb-6">
              This deal currently has a score below 60. Improve the deal metrics or override manually to unlock AI-powered rehab planning, vision analysis, and budget generation.
           </p>
           <Button variant="outline" onClick={() => setIsAdvancedModalOpen(true)} className="border-border text-foreground hover:bg-accent">
              Override & Unlock Anyway
           </Button>
           <AdvancedAnalysisModal 
              isOpen={isAdvancedModalOpen} 
              onClose={() => setIsAdvancedModalOpen(false)} 
              deal={deal}
              onAnalysisComplete={handleAnalysisComplete}
           />
        </div>
     );
  }

  return (
    <div className="space-y-8">
       {/* 1. Header */}
       <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
             <Hammer className="text-primary" /> Rehab Planning Center
          </h2>
          <p className="text-muted-foreground text-sm">Manage renovations, analyze photos, and track budget.</p>
       </div>

       {/* Property data from fetch (Realie) – shown when we have intelligence */}
       {propertyData && (propertyData.yearBuilt != null || propertyData.squareFootage != null || propertyData.bedrooms != null || propertyData.county) && (
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-foreground font-bold mb-4">Property Data (from fetch)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {propertyData.yearBuilt != null && <div className="bg-muted/50 p-3 rounded-lg border border-border"><p className="text-xs text-muted-foreground uppercase">Year Built</p><p className="text-foreground font-medium">{propertyData.yearBuilt}</p></div>}
              {propertyData.squareFootage != null && <div className="bg-muted/50 p-3 rounded-lg border border-border"><p className="text-xs text-muted-foreground uppercase">Sq Ft</p><p className="text-foreground font-medium">{propertyData.squareFootage}</p></div>}
              {propertyData.bedrooms != null && <div className="bg-muted/50 p-3 rounded-lg border border-border"><p className="text-xs text-muted-foreground uppercase">Beds</p><p className="text-foreground font-medium">{propertyData.bedrooms}</p></div>}
              {propertyData.bathrooms != null && <div className="bg-muted/50 p-3 rounded-lg border border-border"><p className="text-xs text-muted-foreground uppercase">Baths</p><p className="text-foreground font-medium">{propertyData.bathrooms}</p></div>}
              {propertyData.county && <div className="bg-muted/50 p-3 rounded-lg border border-border"><p className="text-xs text-muted-foreground uppercase">County</p><p className="text-foreground font-medium">{propertyData.county}</p></div>}
              {propertyData.propertyType && <div className="bg-muted/50 p-3 rounded-lg border border-border"><p className="text-xs text-muted-foreground uppercase">Type</p><p className="text-foreground font-medium">{propertyData.propertyType}</p></div>}
            </div>
          </div>
        )}

       {/* Comps from property intelligence (pulled after property fetch) */}
       {propertyData?.recentComps?.length > 0 && (
          <div>
            <h3 className="text-foreground font-bold mb-4">Comparable Sales (from property data)</h3>
            <CompsDisplay
              comps={propertyData.recentComps}
              loading={false}
              onRefresh={() => {}}
              source="RentCast (from property fetch)"
            />
          </div>
        )}

       {/* 2. Photo Upload first (vision-first flow) */}
       <PhotoUploadSection deal={deal} onPhotosUpdated={handlePhotosUpdated} />

       {/* 3. Start AI Analysis (enabled when photos uploaded) */}
       {!deal.property_details && (
          <div className="flex justify-end">
             <Button onClick={() => setIsAdvancedModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 mr-2" /> Start AI Analysis
             </Button>
          </div>
       )}

       {/* 4. Property Details (after analysis) */}
       {deal.property_details && (
          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-card p-6 rounded-xl border border-border shadow-sm">
             <h3 className="text-foreground font-bold mb-4">Property Specifications</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(deal.property_details).slice(0, 8).map(([key, value]) => (
                   <div key={key} className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                      <p className="text-foreground font-medium truncate" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                   </div>
                ))}
             </div>
          </motion.div>
       )}

       {/* 5. Scope of Work generation */}
       {inputs && (
          <>
             <RehabSOWSection 
                inputs={inputs}
                deal={deal}
                calculations={calculations}
                propertyData={propertyData}
                savedSow={inputs.rehabSow}
                onSowGenerated={onSowGenerated}
             />
             {inputs.rehabSow && onSowGenerated && (
                <SOWBudgetComparison 
                  sowText={inputs.rehabSow}
                  currentBudget={inputs.rehabCosts}
                  deal={deal}
                />
             )}
          </>
       )}

       {/* 6. Budget & Scope of Work */}
       <RehabBudgetReport 
          deal={deal} 
          propertyDetails={deal.property_details} 
          photos={deal.photos}
          onBudgetGenerated={handleBudgetGenerated}
       />

       {/* Modals */}
       <AdvancedAnalysisModal 
          isOpen={isAdvancedModalOpen}
          onClose={() => setIsAdvancedModalOpen(false)}
          deal={deal}
          onAnalysisComplete={handleAnalysisComplete}
       />
    </div>
  );
};

export default RehabPlanTab;
