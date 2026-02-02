import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, Sparkles, Lock, Building2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PhotoUploadSection from '@/components/PhotoUploadSection';
import RehabSOWSection from '@/components/RehabSOWSection';
import SOWBudgetComparison from '@/components/SOWBudgetComparison';
import AdvancedAnalysisModal from '@/components/AdvancedAnalysisModal';
import { extractSOWRecommendations } from '@/utils/sowParser';
import { useToast } from '@/components/ui/use-toast';

const RehabPlanTab = ({ deal, setDeal, isHighPotential, inputs, calculations, propertyData, onSowGenerated }) => {
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [isPropertyDetailsOpen, setIsPropertyDetailsOpen] = useState(false);
  const { toast } = useToast();

  const handleAnalysisComplete = (details) => {
    setDeal(prev => ({ ...prev, property_details: details }));
    toast({ title: "Analysis Integrated", description: "Rehab plan updated with AI insights." });
  };

  const handlePhotosUpdated = (newPhotos) => {
    setDeal(prev => ({ ...prev, photos: newPhotos }));
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

       {/* Single collapsible Property Details (from fetch + AI analysis) */}
       {(propertyData && (propertyData.yearBuilt != null || propertyData.squareFootage != null || propertyData.bedrooms != null || propertyData.county)) || (deal.property_details && Object.keys(deal.property_details).length > 0) ? (
          <Card className="bg-card border-border overflow-hidden shadow-sm">
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors flex flex-row items-center justify-between py-4"
              onClick={() => setIsPropertyDetailsOpen(!isPropertyDetailsOpen)}
            >
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="text-primary" /> Property Details
              </CardTitle>
              {isPropertyDetailsOpen ? <ChevronUp className="text-muted-foreground h-5 w-5" /> : <ChevronDown className="text-muted-foreground h-5 w-5" />}
            </CardHeader>
            <AnimatePresence>
              {isPropertyDetailsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-0 space-y-6">
                    {propertyData && (propertyData.yearBuilt != null || propertyData.squareFootage != null || propertyData.bedrooms != null || propertyData.county) && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">From property data (fetch)</h4>
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
                    {deal.property_details && Object.keys(deal.property_details).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">From AI analysis</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(deal.property_details).map(([key, value]) => (
                            <div key={key} className="bg-muted/50 p-3 rounded-lg border border-border">
                              <p className="text-xs text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                              <p className="text-foreground font-medium truncate" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ) : null}

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

       {/* Scope of Work generation */}
       {inputs && (
          <>
             <RehabSOWSection 
                inputs={inputs}
                deal={deal}
                calculations={calculations}
                propertyData={propertyData}
                savedSow={inputs.rehabSow}
                onSowGenerated={onSowGenerated}
                recentComps={inputs.propertyIntelligence?.recentComps}
             />
             {inputs.rehabSow && onSowGenerated && (
                <SOWBudgetComparison 
                  sowText={inputs.rehabSow}
                  currentBudget={inputs.rehabCosts}
                  deal={deal}
                />
             )}
             {/* Pro Flipper Recommendations: analysis + comps + SOW */}
             {inputs.rehabSow && (() => {
                const recs = extractSOWRecommendations(inputs.rehabSow);
                if (!recs) return null;
                const lines = recs.split(/\n/).filter((l) => l.trim());
                return (
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex gap-2 items-center text-foreground">
                        <Lightbulb className="text-primary" /> Pro Flipper Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 list-none pl-0 text-foreground">
                        {lines.map((line, i) => {
                          const trimmed = line.replace(/^[-*]\s*/, '').trim();
                          if (!trimmed) return null;
                          return (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-primary mt-1 shrink-0">•</span>
                              <span className="leading-relaxed">{trimmed}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                );
             })()}
          </>
       )}

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
