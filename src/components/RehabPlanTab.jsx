
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hammer, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoUploadSection from '@/components/PhotoUploadSection';
import RehabBudgetReport from '@/components/RehabBudgetReport';
import AdvancedAnalysisModal from '@/components/AdvancedAnalysisModal';
import { useToast } from '@/components/ui/use-toast';

const RehabPlanTab = ({ deal, setDeal, isHighPotential }) => {
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
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/50 rounded-2xl border border-white/10 text-center px-4">
           <div className="bg-slate-800 p-6 rounded-full mb-6 relative">
              <Lock className="w-12 h-12 text-gray-500" />
              <div className="absolute top-0 right-0 bg-gold-500 p-1 rounded-full"><Sparkles size={12} className="text-black"/></div>
           </div>
           <h3 className="text-2xl font-bold text-white mb-2">Advanced Analysis Locked</h3>
           <p className="text-gray-400 max-w-md mb-6">
              This deal currently has a score below 75. Improve the deal metrics or override manually to unlock AI-powered rehab planning, vision analysis, and budget generation.
           </p>
           <Button variant="outline" onClick={() => setIsAdvancedModalOpen(true)} className="border-purple-500 text-purple-400 hover:bg-purple-900/20">
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
       {/* 1. Header & Actions */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Hammer className="text-gold-400" /> Rehab Planning Center
             </h2>
             <p className="text-gray-400 text-sm">Manage renovations, analyze photos, and track budget.</p>
          </div>
          {!deal.property_details && (
             <Button onClick={() => setIsAdvancedModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
                <Sparkles className="w-4 h-4 mr-2" /> Start AI Analysis
             </Button>
          )}
       </div>

       {/* 2. Property Details Extraction */}
       {deal.property_details && (
          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-slate-800/30 p-6 rounded-xl border border-white/5">
             <h3 className="text-white font-bold mb-4">Property Specifications</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(deal.property_details).slice(0, 8).map(([key, value]) => (
                   <div key={key} className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-500 uppercase">{key.replace(/_/g, ' ')}</p>
                      <p className="text-white font-medium truncate" title={value}>{value}</p>
                   </div>
                ))}
             </div>
          </motion.div>
       )}

       {/* 3. Photo Upload & Vision Analysis */}
       <PhotoUploadSection deal={deal} onPhotosUpdated={handlePhotosUpdated} />

       {/* 4. Budget & Scope of Work */}
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
