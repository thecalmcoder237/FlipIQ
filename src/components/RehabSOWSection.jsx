
import React, { useState, useEffect } from 'react';
import { Hammer, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Lock, Sparkles, Camera, Building2, MessageSquarePlus, Send, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateRehabInput } from "@/utils/validationUtils";
import { useToast } from "@/components/ui/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logDataFlow } from "@/utils/dataFlowDebug";
import { generateRehabSOW } from '@/services/edgeFunctionService';
import EditableSOWTable from '@/components/EditableSOWTable';

/** Strip ## Pro Flipper Recommendations section from SOW so it only appears in the dedicated card. */
function stripProFlipperSection(text) {
  if (!text || typeof text !== 'string') return text;
  const re = /##\s+Pro Flipper Recommendations[\s\S]*?(?=\n##\s|$)/i;
  return text.replace(re, '').trim();
}

const RehabSOWSection = ({ inputs, deal, calculations, propertyData, savedSow, onSowGenerated, recentComps, readOnly, sowContextMessages = [], onSowContextUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextInput, setContextInput] = useState('');
  const [isEditEstimatesMode, setIsEditEstimatesMode] = useState(false);
  const { toast } = useToast();
  const messages = Array.isArray(sowContextMessages) ? sowContextMessages : [];

  // Check unlock conditions (advanced analysis unlocks at score ≥ 60)
  const dealScore = calculations?.score || 0;
  const isAdvancedUnlocked = dealScore >= 60;
  const hasPhotos = deal?.photos && Array.isArray(deal.photos) && deal.photos.length > 0;
  const hasPropertyData = !!propertyData;
  
  const isUnlocked = isAdvancedUnlocked && hasPhotos && hasPropertyData;

  useEffect(() => {
    logDataFlow('REHAB_SOW_PROPS', { propertyData, inputs, calculations }, new Date());
  }, [inputs, calculations, propertyData]);

  const handleAddContextMessage = () => {
    const trimmed = contextInput?.trim();
    if (!trimmed || !onSowContextUpdated) return;
    const next = [...messages, trimmed];
    onSowContextUpdated(next);
    setContextInput('');
    toast({ title: "Context added", description: "This will guide Claude when generating the SOW." });
  };

  const handleRemoveContextMessage = (index) => {
    if (!onSowContextUpdated) return;
    const next = messages.filter((_, i) => i !== index);
    onSowContextUpdated(next);
  };

  const handleGenerateSOW = async () => {
    setError(null);
    
    // Check unlock conditions before proceeding
    if (!isUnlocked) {
      const missingRequirements = [];
      if (!isAdvancedUnlocked) missingRequirements.push("Deal score must be ≥ 60 (Advanced Analysis unlocked)");
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
        rehabBudget: Number(inputs?.rehabCosts) || 0,
        propertyDescription: typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData || {}),
        images: imageUrls,
        options: {
          deal: {
            address: deal?.address ?? userAddress,
            arv: deal?.arv ?? inputs?.arv ?? 0,
            purchase_price: deal?.purchase_price ?? deal?.purchasePrice ?? inputs?.purchase_price ?? 0,
            rehab_costs: Number(inputs?.rehabCosts) || 0,
            rehabCategory: inputs?.rehabCategory ?? deal?.rehabCategory ?? 'Cosmetic',
            squareFootage: propertyData?.squareFootage ?? propertyData?.square_footage ?? deal?.sqft,
            bedrooms: propertyData?.bedrooms ?? deal?.bedrooms,
            bathrooms: propertyData?.bathrooms ?? deal?.bathrooms,
            yearBuilt: propertyData?.yearBuilt ?? propertyData?.year_built ?? deal?.yearBuilt,
            county: propertyData?.county ?? deal?.county,
            zipCode: deal?.zipCode ?? deal?.zip_code ?? inputs?.zipCode,
          },
          recentComps: Array.isArray(recentComps) ? recentComps : [],
        },
    };
    if (messages.length > 0) {
      requestPayload.options.sowContextMessages = messages;
    }

    console.log('Rehab SOW Request with images and context:', { ...requestPayload, imagesCount: imageUrls.length });

    try {
      const data = await generateRehabSOW(
        requestPayload.userAddress,
        requestPayload.rehabBudget,
        requestPayload.propertyDescription,
        requestPayload.images,
        requestPayload.options
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
      setIsEditEstimatesMode(false);

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
        return <h3 key={i} className="text-xl font-bold text-primary mt-6 mb-3 border-b border-border pb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.trim().startsWith('|')) {
        const cols = line.split('|').filter(c => c.trim() !== '');
        if (line.includes('---')) return null;
        const colCount = Math.max(2, Math.min(cols.length, 4));
        const lastIdx = cols.length - 1;
        return (
           <div key={i} className={`grid gap-2 py-2 border-b border-border text-sm hover:bg-accent px-2 ${colCount === 2 ? 'grid-cols-2' : colCount === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {cols.map((c, idx) => <span key={idx} className={idx === lastIdx ? "text-right font-mono text-green-600 font-medium" : "text-foreground"}>{c.trim()}</span>)}
           </div>
        );
      }
      if (line.trim().startsWith('- ')) {
         return <li key={i} className="ml-4 text-foreground mb-1 list-disc pl-2">{line.replace('- ', '')}</li>
      }
      if (line.trim() === '') return <br key={i}/>;
      const trimmed = line.trim();
      const isTimeline = /estimated\s*(?:timeline|duration|time)\s*:\s*\d+/i.test(trimmed) || /^\d+\s*(?:weeks?|months?)\s*(?:estimated|timeline)?/i.test(trimmed);
      const isTotalCost = /total\s*estimated\s*cost\s*:\s*\$?[\d,]+/i.test(trimmed) || /^total\s*:\s*\$?[\d,]+/i.test(trimmed);
      if (isTimeline || isTotalCost) {
        return (
          <p key={i} className="mb-2 py-2 px-3 rounded-md bg-primary/15 border-l-4 border-primary font-semibold text-primary">
            {trimmed}
          </p>
        );
      }
      return <p key={i} className="text-foreground mb-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <ErrorBoundary>
       <div className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex flex-col items-start gap-2 mb-4">
                <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-5 w-5"/>
                    <span>Error Generating SOW</span>
                </div>
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                    Try Again
                </Button>
            </div>
          )}

          {/* SOW Context Chat - guide Claude with property-specific notes */}
          {!readOnly && onSowContextUpdated && (
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-primary" />
                  SOW Context
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Add property-specific notes to guide Claude. Examples: &quot;Basement is crawl space, not full basement&quot;, &quot;Roof needs repair, not full replacement&quot;.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {messages.length > 0 && (
                  <div className="space-y-2">
                    {messages.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm">
                        <span className="flex-1 text-foreground">{msg}</span>
                        <Button variant="ghost" size="sm" className="shrink-0 h-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveContextMessage(i)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    placeholder="e.g. Basement is crawl space. Roof needs repair only, not replacement."
                    className="min-h-[60px] resize-none bg-background border-input text-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddContextMessage();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddContextMessage} disabled={!contextInput?.trim()} className="shrink-0 self-end bg-primary text-primary-foreground hover:bg-primary/90">
                    <Send className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only with no SOW */}
          {readOnly && !savedSow && (
            <Card className="bg-card border-border border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No scope of work available for this deal.</p>
              </CardContent>
            </Card>
          )}

          {/* Locked State - Requirements not met */}
          {!readOnly && !isUnlocked && !savedSow && !loading && !error && (
            <Card className="bg-card border-border border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4 relative">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                  <div className="absolute top-0 right-0 bg-primary p-1 rounded-full">
                    <Sparkles size={12} className="text-primary-foreground"/>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Advanced Rehab Analysis Locked</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Complete the following requirements to unlock AI-powered rehab analysis:
                </p>
                <div className="space-y-2 mb-6 text-left w-full max-w-md">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isAdvancedUnlocked ? 'bg-green-50 border border-green-200' : 'bg-muted border border-border'}`}>
                    {isAdvancedUnlocked ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Lock className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isAdvancedUnlocked ? 'text-green-600' : 'text-muted-foreground'}`}>
                        Deal Score ≥ 60 (Advanced Analysis Unlocked)
                      </p>
                      {!isAdvancedUnlocked && <p className="text-xs text-muted-foreground mt-1">Current score: {dealScore}</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${hasPhotos ? 'bg-green-50 border border-green-200' : 'bg-muted border border-border'}`}>
                    {hasPhotos ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Camera className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${hasPhotos ? 'text-green-600' : 'text-muted-foreground'}`}>
                        Upload Property Photos
                      </p>
                      {hasPhotos && <p className="text-xs text-muted-foreground mt-1">{deal.photos.length} photo(s) uploaded</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${hasPropertyData ? 'bg-green-50 border border-green-200' : 'bg-muted border border-border'}`}>
                    {hasPropertyData ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${hasPropertyData ? 'text-green-600' : 'text-muted-foreground'}`}>
                        Fetch Property Intelligence Data
                      </p>
                      {hasPropertyData && <p className="text-xs text-muted-foreground mt-1">Property data loaded</p>}
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerateSOW} 
                  disabled={!isUnlocked}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnlocked ? "Generate SOW & Budget" : "Requirements Not Met"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Unlocked State / CTA */}
          {!readOnly && isUnlocked && !savedSow && !loading && !error && (
            <Card className="bg-card border-border border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Hammer className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Generate Professional SOW</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Create a detailed line-item budget and scope of work based on visual analysis of uploaded photos and comprehensive property data. Estimates will reflect actual work needed, not budget constraints.
                </p>
                <Button 
                  onClick={handleGenerateSOW} 
                  className="bg-gradient-to-r from-primary to-accentBrand hover:from-primary/90 hover:to-accentBrand/90 text-primary-foreground min-w-[200px]"
                >
                  Generate SOW & Budget
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4 p-12 border border-border rounded-xl bg-muted text-center flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-lg text-foreground font-medium">Drafting Scope of Work...</h3>
              <p className="text-sm text-muted-foreground">AI is analyzing local labor rates and material costs for 2025.</p>
            </div>
          )}

          {/* Result State */}
          {savedSow && !loading && (
            <Card className="bg-card border-border shadow-xl overflow-hidden">
              <CardHeader className="bg-muted border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Hammer className="text-primary" /> 
                  AI-Generated Scope of Work
                </CardTitle>
                {!readOnly && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditEstimatesMode(true)}
                    className="border-border hover:bg-accent text-foreground"
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit Estimates
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateSOW}
                    className="border-border hover:bg-accent text-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                  </Button>
                </div>
                )}
              </CardHeader>
              <CardContent className="p-6 bg-background">
                {isEditEstimatesMode ? (
                  <EditableSOWTable
                    sowText={savedSow}
                    readOnly={false}
                    onSave={(updatedSow) => {
                      onSowGenerated?.(updatedSow);
                      setIsEditEstimatesMode(false);
                      toast({ title: "Estimates updated", description: "SOW totals have been recalculated." });
                    }}
                    onCancel={() => setIsEditEstimatesMode(false)}
                  />
                ) : (
                <div className="prose max-w-none">
                   {renderContent(stripProFlipperSection(savedSow))}
                </div>
                )}
                <div className="mt-8 bg-primary/20 border border-primary/30 p-4 rounded-lg flex items-start gap-3">
                   <CheckCircle2 className="text-primary shrink-0 mt-1" />
                   <div>
                      <p className="font-bold text-foreground">Estimator's Note</p>
                      <p className="text-xs text-muted-foreground">
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
