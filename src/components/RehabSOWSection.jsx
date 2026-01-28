
import React, { useState, useEffect } from 'react';
import { Hammer, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Lock, Sparkles, Camera, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { validateRehabInput } from "@/utils/validationUtils";
import { useToast } from "@/components/ui/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logDataFlow } from "@/utils/dataFlowDebug";
import { generateRehabSOW } from '@/services/edgeFunctionService';

const RehabSOWSection = ({ inputs, deal, calculations, propertyData, savedSow, onSowGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  // Check unlock conditions
  const dealScore = calculations?.score || 0;
  const isAdvancedUnlocked = dealScore >= 70;
  const hasPhotos = deal?.photos && Array.isArray(deal.photos) && deal.photos.length > 0;
  const hasPropertyData = !!propertyData;
  
  const isUnlocked = isAdvancedUnlocked && hasPhotos && hasPropertyData;

  useEffect(() => {
    logDataFlow('REHAB_SOW_PROPS', { propertyData, inputs, calculations }, new Date());
  }, [inputs, calculations, propertyData]);

  const handleGenerateSOW = async () => {
    setError(null);
    
    // Check unlock conditions before proceeding
    if (!isUnlocked) {
      const missingRequirements = [];
      if (!isAdvancedUnlocked) missingRequirements.push("Deal score must be ≥ 70 (Advanced Analysis unlocked)");
      if (!hasPhotos) missingRequirements.push("Upload property photos");
      if (!hasPropertyData) missingRequirements.push("Fetch property intelligence data");
      
      toast({
        variant: "destructive",
        title: "SOW Generation Locked",
        description: `Please complete: ${missingRequirements.join(", ")}`
      });
      return;
    }
    
    // 1. Basic Validation (no budget constraint - SOW is based on visual analysis)
    const userAddress = inputs?.address;
    if (!userAddress || userAddress.trim().length < 5) {
      setError("Valid address is required");
      toast({
        variant: "destructive",
        title: "Cannot Generate SOW",
        description: "Please provide a valid property address"
      });
      return;
    }

    setLoading(true);
    
    // Prepare images array - extract URLs from photo objects
    const imageUrls = (deal?.photos || []).map(photo => photo.url || photo).filter(Boolean);
    
    const requestPayload = {
        userAddress: userAddress,
        rehabBudget: Number(inputs?.rehabCosts) || 0, // Optional reference only, not a constraint
        propertyDescription: typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData || {}),
        images: imageUrls // Include images for Claude Vision analysis
    };

    console.log('Rehab SOW Request with images:', { ...requestPayload, imagesCount: imageUrls.length });

    try {
      // Use edge function service - now includes images
      const data = await generateRehabSOW(
        requestPayload.userAddress, 
        requestPayload.rehabBudget, 
        requestPayload.propertyDescription,
        requestPayload.images
      );

      console.log('Rehab SOW Response:', data);

      if (!data.data || typeof data.data !== 'string') {
        throw new Error("Invalid response format: missing content");
      }

      toast({
        title: "Success",
        description: "Rehab Scope of Work generated successfully.",
      });

      if (onSowGenerated) {
        onSowGenerated(data.data);
      }

    } catch (err) {
      console.error('Rehab SOW Error:', err);
      logDataFlow('GENERATE_SOW_ERROR', err.message, new Date());
      setError(err.message || "Failed to generate Scope of Work.");
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: err.message || "Failed to generate Scope of Work. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-xl font-bold text-blue-600 mt-6 mb-3 border-b border-gray-200 pb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.trim().startsWith('|')) {
        const cols = line.split('|').filter(c => c.trim() !== '');
        if (line.includes('---')) return null;
        return (
           <div key={i} className="grid grid-cols-3 gap-2 py-2 border-b border-gray-200 text-sm hover:bg-gray-50 px-2">
              {cols.map((c, idx) => <span key={idx} className={idx === 2 ? "text-right font-mono text-green-600 font-medium" : "text-gray-700"}>{c.trim()}</span>)}
           </div>
        );
      }
      if (line.trim().startsWith('- ')) {
         return <li key={i} className="ml-4 text-gray-700 mb-1 list-disc pl-2">{line.replace('- ', '')}</li>
      }
      if (line.trim() === '') return <br key={i}/>;
      return <p key={i} className="text-gray-700 mb-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <ErrorBoundary>
       <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col items-start gap-2 mb-4">
                <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-5 w-5"/>
                    <span>Error Generating SOW</span>
                </div>
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-2 border-red-300 text-red-800 hover:bg-red-100">
                    Try Again
                </Button>
            </div>
          )}

          {/* Locked State - Requirements not met */}
          {!isUnlocked && !savedSow && !loading && !error && (
            <Card className="bg-white border-gray-200 border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4 relative">
                  <Lock className="w-8 h-8 text-gray-500" />
                  <div className="absolute top-0 right-0 bg-gold-500 p-1 rounded-full">
                    <Sparkles size={12} className="text-black"/>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Rehab Analysis Locked</h3>
                <p className="text-gray-600 max-w-md mb-6">
                  Complete the following requirements to unlock AI-powered rehab analysis:
                </p>
                <div className="space-y-2 mb-6 text-left w-full max-w-md">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isAdvancedUnlocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    {isAdvancedUnlocked ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Lock className="w-5 h-5 text-gray-400 shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isAdvancedUnlocked ? 'text-green-600' : 'text-gray-600'}`}>
                        Deal Score ≥ 70 (Advanced Analysis Unlocked)
                      </p>
                      {!isAdvancedUnlocked && <p className="text-xs text-gray-500 mt-1">Current score: {dealScore}</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${hasPhotos ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    {hasPhotos ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Camera className="w-5 h-5 text-gray-400 shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${hasPhotos ? 'text-green-600' : 'text-gray-600'}`}>
                        Upload Property Photos
                      </p>
                      {hasPhotos && <p className="text-xs text-gray-500 mt-1">{deal.photos.length} photo(s) uploaded</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${hasPropertyData ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    {hasPropertyData ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Building2 className="w-5 h-5 text-gray-400 shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${hasPropertyData ? 'text-green-600' : 'text-gray-600'}`}>
                        Fetch Property Intelligence Data
                      </p>
                      {hasPropertyData && <p className="text-xs text-gray-500 mt-1">Property data loaded</p>}
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerateSOW} 
                  disabled={!isUnlocked}
                  className="bg-gray-600 hover:bg-gray-700 text-white min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnlocked ? "Generate SOW & Budget" : "Requirements Not Met"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Unlocked State / CTA */}
          {isUnlocked && !savedSow && !loading && !error && (
            <Card className="bg-white border-gray-200 border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-orange-50 rounded-full mb-4">
                  <Hammer className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Generate Professional SOW</h3>
                <p className="text-gray-600 max-w-md mb-6">
                  Create a detailed line-item budget and scope of work based on visual analysis of uploaded photos and comprehensive property data. Estimates will reflect actual work needed, not budget constraints.
                </p>
                <Button 
                  onClick={handleGenerateSOW} 
                  className="bg-orange-600 hover:bg-orange-700 text-white min-w-[200px]"
                >
                  Generate SOW & Budget
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4 p-12 border border-gray-200 rounded-xl bg-gray-50 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg text-gray-900 font-medium">Drafting Scope of Work...</h3>
              <p className="text-sm text-gray-600">AI is analyzing local labor rates and material costs for 2025.</p>
            </div>
          )}

          {/* Result State */}
          {savedSow && !loading && (
            <Card className="bg-white border-gray-200 shadow-xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Hammer className="text-orange-600" /> 
                  AI-Generated Scope of Work
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateSOW}
                  className="border-gray-200 hover:bg-gray-100 text-gray-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="prose max-w-none">
                   {renderContent(savedSow)}
                </div>
                
                <div className="mt-8 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-start gap-3">
                   <CheckCircle2 className="text-blue-400 shrink-0 mt-1" />
                   <div>
                      <p className="font-bold text-blue-100">Estimator's Note</p>
                      <p className="text-xs text-blue-200/70">
                         This SOW is based on standard 2025 market rates for the provided location. 
                         Always verify with local contractors before finalizing your budget.
                      </p>
                   </div>
                </div>
              </CardContent>
            </Card>
          )}
       </div>
    </ErrorBoundary>
  );
};

export default RehabSOWSection;
