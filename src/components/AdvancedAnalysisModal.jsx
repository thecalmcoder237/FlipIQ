import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { runAdvancedRehabAnalysis } from '@/services/edgeFunctionService';

const AdvancedAnalysisModal = ({ isOpen, onClose, deal, onAnalysisComplete }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const hasPhotos = deal?.photos && Array.isArray(deal.photos) && deal.photos.length >= 1;
  const photoCount = deal?.photos?.length ?? 0;

  const handleAnalyze = async () => {
    if (!hasPhotos) return;
    setLoading(true);
    try {
      const photoUrls = (deal.photos || []).map((p) => p.url || p).filter(Boolean);
      const perPhotoAnalysis = (deal.photos || []).map((p) => ({ url: p.url || p, analysis: p.analysis })).filter((p) => p.url);

      const data = await runAdvancedRehabAnalysis(deal, photoUrls, perPhotoAnalysis);
      const details = data?.property_details ?? data;

      if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
        throw new Error("No property details returned from analysis");
      }

      const { error: dbError } = await supabase
        .from('deals')
        .update({ property_details: details })
        .eq('id', deal.id);

      if (dbError) throw dbError;

      toast({ title: "Analysis Complete", description: "Property details extracted from photos successfully." });
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
            Claude AI will analyze your uploaded photos to extract construction details, system conditions, and value-add opportunities for a detailed budget.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {!hasPhotos && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/40 p-3 text-amber-200 text-sm">
              <Camera className="h-5 w-5 shrink-0" />
              <span>Upload at least one property photo to run vision-based analysis.</span>
            </div>
          )}
          {hasPhotos && (
            <p className="text-sm text-gray-400">
              {photoCount} photo{photoCount !== 1 ? 's' : ''} will be analyzed.
            </p>
          )}
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
          <Button
            onClick={handleAnalyze}
            disabled={loading || !hasPhotos}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Analyzing...</> : "Start Analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedAnalysisModal;
