
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Brain, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AdvancedAnalysisModal = ({ isOpen, onClose, deal, onAnalysisComplete }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // Call Edge Function directly
      const { data: details, error: functionError } = await supabase.functions.invoke('generate-rehab-sow', {
        body: { 
          action: 'analyze',
          deal: deal
        }
      });

      if (functionError) throw functionError;
      if (!details) throw new Error("No data returned from analysis");
      
      // Update deal with extracted details
      const { error: dbError } = await supabase
        .from('deals')
        .update({ property_details: details })
        .eq('id', deal.id);

      if (dbError) throw dbError;

      toast({ title: "Analysis Complete", description: "Property details extracted successfully." });
      if (onAnalysisComplete) onAnalysisComplete(details);
      onClose();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Analysis Failed", description: error.message || "Could not extract property data." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="text-purple-400" /> Advanced AI Analysis
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Trigger Claude AI to deeply analyze this property's potential. We will extract construction details, refine renovation needs, and prepare for a detailed budget.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
           <div className="bg-slate-800 p-4 rounded-lg text-sm text-gray-300">
              <ul className="list-disc pl-5 space-y-1">
                 <li>Extract Architecture & Build Type</li>
                 <li>Assess System Ages (Roof, HVAC, etc)</li>
                 <li>Identify Value-Add Opportunities</li>
                 <li>Prepare Data for Detailed Budgeting</li>
              </ul>
           </div>
        </div>

        <DialogFooter>
           <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">Cancel</Button>
           <Button onClick={handleAnalyze} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Analyzing...</> : "Start Analysis"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedAnalysisModal;
