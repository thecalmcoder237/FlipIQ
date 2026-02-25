
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Hammer, Home, FileText, Share2, Sparkles, Building2, Table as TableIcon, Settings2, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateDealMetrics } from '@/utils/dealCalculations';
import { applyScenarioAdjustments } from '@/utils/advancedDealCalculations';
import { dealService } from '@/services/dealService';
import { updateDealSowContext, updateDealRehabSow, fetchCompsWebSearch } from '@/services/edgeFunctionService';
import { logDataFlow, validateCalculations } from '@/utils/dataFlowDebug';

// Components
import ComprehensiveFinancialBreakdown from '@/components/ComprehensiveFinancialBreakdown';
import DealQualityScore from '@/components/DealQualityScore';
import ScenarioComparison from '@/components/ScenarioComparison';
import Breadcrumb from '@/components/Breadcrumb';
import ProgressIndicator from '@/components/ProgressIndicator';
import DealSummaryCard from '@/components/DealSummaryCard';
import RehabPlanTab from '@/components/RehabPlanTab';
import CompsDisplay from '@/components/CompsDisplay';
import NotesPanel from '@/components/NotesPanel';
import NavigationButtons from '@/components/NavigationButtons';
import EditDealModal from '@/components/EditDealModal';
import PropertyIntelligenceSection from '@/components/PropertyIntelligenceSection';
import RehabSOWSection from '@/components/RehabSOWSection';
import ExportAnalysisButton from '@/components/ExportAnalysisButton';
import RehabInsightsExportButton from '@/components/RehabInsightsExportButton';
import PrintTabButton from '@/components/PrintTabButton';
import { printIntelligenceReport, printRehabInsightsReport, printCompsReport } from '@/utils/printReportUtils';
import { normalizePropertyIntelligenceResponse, normalizeComp, isCompWithinLast6Months } from '@/utils/propertyIntelligenceSchema';
import SOWBudgetComparison from '@/components/SOWBudgetComparison';
import PhotoUploadSection from '@/components/PhotoUploadSection';
import ScenarioRiskModel from '@/components/ScenarioRiskModel';
import ARVSensitivityHeatmap from '@/components/ARVSensitivityHeatmap';
import NeighborhoodIntelligenceCard from '@/components/NeighborhoodIntelligenceCard';
import MarketStrengthGauge from '@/components/MarketStrengthGauge';
import SeventyPercentRule from '@/components/SeventyPercentRule';
import DebugDashboard from '@/components/DebugDashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DealAnalysisPage = ({ readOnly = false, initialDeal, initialInputs, initialMetrics }) => {
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, isAdmin } = useAuth();

  // State
  const [deal, setDeal] = useState(readOnly ? initialDeal : null);
  const [inputs, setInputs] = useState(readOnly ? initialInputs : null);
  const [metrics, setMetrics] = useState(readOnly ? initialMetrics : null);
  
  // Debug State
  const [loadedData, setLoadedData] = useState(null);
  
  // Scenarios (Always Active)
  const [activeScenarioMetrics, setActiveScenarioMetrics] = useState(null);
  const [scenarioMode, setScenarioMode] = useState('worst'); // Default to 'Stress Test' view

  // Controlled tab state — persists across loading cycles so switching tabs
  // while idle (e.g. during a background token refresh) never resets position.
  const [activeTab, setActiveTab] = useState('intelligence');

  // Loading States
  const [loading, setLoading] = useState(!readOnly);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [compsSearching, setCompsSearching] = useState(false);
  const pageContainerRef = useRef(null);
  // Track the user id that last triggered a fetch so re-rendering with
  // the same logged-in user (e.g. after a background token refresh) does
  // not re-fetch and reset the page.
  const lastFetchedUserIdRef = useRef(null);

  useEffect(() => {
    if (readOnly) return;
    if (!dealId) {
       logDataFlow('ERROR_MISSING_DEAL_ID', {}, new Date());
       navigate('/deal-input');
       return;
    }
    
    logDataFlow('DEAL_ID_FROM_URL', dealId, new Date());

    if (currentUser) {
      // Skip re-fetch if we already loaded for this user + deal combination
      const fetchKey = `${currentUser.id}:${dealId}`;
      if (lastFetchedUserIdRef.current === fetchKey) return;
      lastFetchedUserIdRef.current = fetchKey;
      fetchDeal();
    }
  }, [dealId, currentUser, readOnly]);

  const fetchDeal = async () => {
    try {
      setLoading(true);
      const loadedInputs = await dealService.loadDeal(dealId, currentUser.id);
      
      logDataFlow('LOADED_FROM_DB', loadedInputs, new Date());
      setLoadedData(loadedInputs);

      if (!loadedInputs) {
        setDeal(null);
        setInputs(null);
        setMetrics(null);
        setLoading(false);
        toast({ variant: "destructive", title: "Deal not found", description: "This deal may have been deleted or you may not have access. Try opening it from Deal History." });
        return;
      }

      setInputs(loadedInputs);
      setDeal(loadedInputs); 
      logDataFlow('INPUTS_STATE_SET', loadedInputs, new Date());
      
      const calculatedMetrics = calculateDealMetrics(loadedInputs);
      logDataFlow('CALCULATION_RESULTS', calculatedMetrics, new Date());
      
      const calcValidation = validateCalculations(calculatedMetrics);
      if (!calcValidation.isValid) {
          console.warn("Calculation Validation Issues:", calcValidation.issues);
      }

      setMetrics(calculatedMetrics);
      
    } catch (err) {
      console.error(err);
      logDataFlow('LOAD_ERROR', err.message, new Date());
      toast({ variant: "destructive", title: "Error fetching deal", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Automatically calculate scenario whenever metrics, inputs, or mode changes
  const recalculateScenario = (currentDeal, currentInputs, currentScenarioMode) => {
    const effectiveDeal = currentDeal || deal;
    const effectiveMode = currentScenarioMode ?? scenarioMode;
    if (!effectiveDeal || !effectiveMode) return;

    // Merge freshest input values so purchase/rehab changes reflect immediately
    const mergedDeal = currentInputs
      ? {
          ...effectiveDeal,
          purchasePrice: currentInputs.purchasePrice ?? effectiveDeal.purchasePrice,
          purchase_price: currentInputs.purchasePrice ?? effectiveDeal.purchase_price,
          rehabCosts: currentInputs.rehabCosts ?? effectiveDeal.rehabCosts,
          rehab_costs: currentInputs.rehabCosts ?? effectiveDeal.rehab_costs,
          arv: currentInputs.arv ?? effectiveDeal.arv,
        }
      : effectiveDeal;

    let adjustments = { rehabOverrunPercent: 0, holdingPeriodAdjustment: 0, marketAppreciationPercent: 0, permitDelayDays: 0 };
    if (effectiveMode === 'best') {
      adjustments = { rehabOverrunPercent: -10, holdingPeriodAdjustment: -1, marketAppreciationPercent: 5, permitDelayDays: 0 };
    } else if (effectiveMode === 'worst') {
      adjustments = { rehabOverrunPercent: 25, holdingPeriodAdjustment: 3, marketAppreciationPercent: -10, permitDelayDays: 0 };
    }

    const results = applyScenarioAdjustments(mergedDeal, adjustments);
    setActiveScenarioMetrics(results);
  };

  useEffect(() => {
    recalculateScenario(deal, inputs, scenarioMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal, metrics, scenarioMode, inputs]);

  const isOwner = (deal?.userId ?? deal?.user_id) === currentUser?.id;
  const canEdit = isOwner || isAdmin;

  const handlePropertyDataFetch = async (data) => {
      const updatedInputs = { ...inputs, propertyIntelligence: data };
      setInputs(updatedInputs);
      setDeal(updatedInputs);
      if (!canEdit) return;
      try {
         await dealService.saveDeal(updatedInputs, currentUser.id);
      } catch (error) {
         console.error("Failed to save property intel", error);
      }
  };

  const handleAddComp = (newComp) => {
    const existing = inputs?.propertyIntelligence ?? {};
    const merged = {
      ...existing,
      recentComps: [...(Array.isArray(existing.recentComps) ? existing.recentComps : []), newComp],
    };
    const normalized = normalizePropertyIntelligenceResponse(merged);
    handlePropertyDataFetch(normalized);
  };

  const handleSearchCompsWithAI = async () => {
    const address = (inputs?.address ?? deal?.address ?? '').trim();
    if (!address || address.length < 5) {
      toast({ variant: 'destructive', title: 'Address required', description: 'Enter a property address to search for comps with AI.' });
      return;
    }
    const zipToSend = (inputs?.zipCode ?? deal?.zipCode ?? '').trim().replace(/\D/g, '').slice(0, 5);
    const pi = inputs?.propertyIntelligence;
    const subjectLat = pi?.latitude != null && Number.isFinite(Number(pi.latitude)) ? Number(pi.latitude) : (pi?.avmSubject?.latitude != null && Number.isFinite(Number(pi.avmSubject.latitude)) ? Number(pi.avmSubject.latitude) : undefined);
    const subjectLng = pi?.longitude != null && Number.isFinite(Number(pi.longitude)) ? Number(pi.longitude) : (pi?.avmSubject?.longitude != null && Number.isFinite(Number(pi.avmSubject.longitude)) ? Number(pi.avmSubject.longitude) : undefined);
    setCompsSearching(true);
    try {
      const result = await fetchCompsWebSearch(address, zipToSend, { lat: subjectLat, lng: subjectLng });
      const rawComps = Array.isArray(result?.recentComps) ? result.recentComps : (Array.isArray(result?.comps) ? result.comps : []);
      const normalizedComps = rawComps
        .map((c) => normalizeComp(c))
        .filter(Boolean)
        .filter(isCompWithinLast6Months);
      const existing = inputs?.propertyIntelligence ?? {};
      const merged = {
        ...existing,
        recentComps: [...(Array.isArray(existing.recentComps) ? existing.recentComps : []), ...normalizedComps],
        source: result?.source ?? existing?.source,
      };
      const normalized = normalizePropertyIntelligenceResponse(merged);
      handlePropertyDataFetch(normalized);
      const count = normalizedComps.length;
      toast({ title: 'AI comps added', description: count ? `${count} comparable(s) from ChatGPT added.` : 'No comps extracted. Try refining the address.' });
    } catch (err) {
      console.error('Search comps with AI failed:', err);
      toast({ variant: 'destructive', title: 'AI comps failed', description: err?.message || 'Could not fetch comps with AI. Try again.' });
    } finally {
      setCompsSearching(false);
    }
  };

  const handleNeighborhoodDataFetch = async (data) => {
      const updatedInputs = { ...inputs, neighborhoodIntelligence: data };
      setInputs(updatedInputs);
      setDeal(updatedInputs);
      if (!canEdit) return;
      try {
         await dealService.saveDeal(updatedInputs, currentUser.id);
      } catch (error) {
         console.error("Failed to save neighborhood intelligence", error);
      }
  };

  const handleSowGenerated = async (sowText) => {
      const updatedInputs = { ...inputs, rehabSow: sowText };
      setInputs(updatedInputs);
      setDeal(updatedInputs);

      const effectiveId = inputs?.id ?? deal?.id ?? dealId;
      if (!effectiveId) {
        toast({ variant: "destructive", title: "Save failed", description: "Deal ID not found — SOW displayed but not saved." });
        return;
      }

      try {
         await updateDealRehabSow(effectiveId, sowText);
      } catch (error) {
         console.error("Failed to save SOW", error);
         toast({ variant: "destructive", title: "Save failed", description: error.message || "Could not persist generated SOW." });
      }
  };

  const handleDealUpdate = (updatedDeal) => {
    setDeal(updatedDeal);
    setInputs(updatedDeal);
    setMetrics(calculateDealMetrics(updatedDeal));
  };

  const handleRehabDealUpdate = (updater) => {
    const next = typeof updater === 'function' ? updater(deal) : updater;
    setDeal(next);
    setInputs(next);
    if (!canEdit) return;
    dealService.saveDeal(next, currentUser.id).catch((err) => console.error('Failed to save rehab updates', err));
  };

  const handleSowContextUpdated = async (sowContextMessages) => {
    const updated = { ...deal, sowContextMessages };
    setDeal(updated);
    setInputs(updated);

    try {
      if (canEdit) {
        await dealService.saveDeal(updated, currentUser.id);
      } else {
        await updateDealSowContext(deal.id, sowContextMessages);
      }
      toast({ title: "SOW context saved", description: "Your changes have been saved." });
    } catch (err) {
      console.error('Failed to save SOW context', err);
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    }
  };

  const handleApplyRehabCost = (amount) => {
    const updated = { ...deal, rehabCosts: amount };
    setDeal(updated);
    setInputs(updated);
    setMetrics(calculateDealMetrics(updated));
    if (!canEdit) return;
    dealService.saveDeal(updated, currentUser.id).catch((err) => {
      console.error('Failed to save rehab cost', err);
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    });
    toast({ title: "Rehab budget updated", description: `Intelligence tab will reflect $${amount?.toLocaleString()}` });
  };

  const handleShare = async () => {
    if (readOnly || !currentUser) return;
    try {
      let token = deal.shareToken || deal.share_token;
      if (!token) {
        const { shareToken } = await dealService.updateShareToken(deal.id, currentUser.id);
        token = shareToken;
        setDeal(prev => ({ ...prev, shareToken: token }));
      }
      const url = `${window.location.origin}/deal/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Share this link for read-only access." });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to copy link", description: e.message });
    }
  };

  if (loading) {
    return <div className="min-h-[40vh] flex items-center justify-center bg-muted"><p className="text-foreground">Loading analysis...</p></div>;
  }
  if (!deal) {
    return <div className="min-h-[40vh] flex items-center justify-center bg-muted"><p className="text-foreground">Deal not found.</p></div>;
  }

  // We display the Base Metrics in the top cards, but the Scenario section below allows comparison.
  // The summary card usually shows "Current Plan".
  const displayMetrics = metrics || {};
  const effectiveDealId = dealId || deal?.id;

  return (
    <div ref={pageContainerRef} className="min-h-screen bg-muted px-2 md:px-4 py-4 md:py-8 max-w-7xl mx-auto mb-20 overflow-x-hidden">
      <Helmet><title>Deal Analysis - {deal.address} | FlipIQ</title></Helmet>
      <Breadcrumb />
      <ProgressIndicator />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Deal Analysis</h1>
        <div className="flex flex-wrap gap-2">
            {!readOnly && canEdit && (
              <Button 
                variant="outline" 
                className="text-foreground border-primary hover:bg-primary/10"
                onClick={() => navigate(`/deal/action?id=${effectiveDealId}`)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Action Hub
              </Button>
            )}
            {!readOnly && canEdit && (
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent" onClick={handleShare} title="Copy share link">
                <Share2/>
              </Button>
            )}
            <ExportAnalysisButton 
               deal={deal} 
               metrics={displayMetrics} 
               propertyIntelligence={inputs.propertyIntelligence}
               sowData={inputs.rehabSow}
               pageRef={pageContainerRef}
            />
        </div>
      </div>

      {isAdmin && !isOwner && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0" />
          You are editing this deal as an administrator. Changes will be saved to the owner&apos;s deal.
        </div>
      )}
      <DealSummaryCard
        deal={deal}
        metrics={displayMetrics}
        onEdit={readOnly || !canEdit ? undefined : () => setIsEditModalOpen(true)}
        onDealUpdate={readOnly || !canEdit ? undefined : (updated) => { setDeal(updated); setInputs(updated); setMetrics(calculateDealMetrics(updated)); }}
        readOnly={readOnly}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
         <div className="mb-2">
           <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Analysis Sections</p>
         </div>
         <TabsList className="bg-muted border border-border p-1.5 mb-6 flex flex-wrap h-auto shadow-md gap-1 w-full">
            <TabsTrigger value="intelligence" className="gap-2 font-semibold text-sm py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:font-bold data-[state=active]:shadow-md"><BarChart3 size={18}/> Intelligence</TabsTrigger>
            <TabsTrigger value="rehab-insights" className="gap-2 font-semibold text-sm py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:font-bold data-[state=active]:shadow-md"><Sparkles size={18}/> Rehab Insights</TabsTrigger>
            <TabsTrigger value="comps" className="gap-2 font-semibold text-sm py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:font-bold data-[state=active]:shadow-md"><Home size={18}/> Comps</TabsTrigger>
            <TabsTrigger value="scenario-risk" className="gap-2 font-semibold text-sm py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:font-bold data-[state=active]:shadow-md"><Shield size={18}/> Scenario Risk Model</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2 font-semibold text-sm py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:font-bold data-[state=active]:shadow-md"><FileText size={18}/> Notes</TabsTrigger>
            {!readOnly && (deal?.status === 'Funded' || deal?.status === 'Closed' || deal?.status === 'Completed' || deal?.isFunded || deal?.isClosed) && (
              <TabsTrigger value="project-mgmt" className="gap-2 font-semibold text-sm py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:font-bold data-[state=active]:shadow-md">
                <Hammer size={18}/> Project Management
              </TabsTrigger>
            )}
         </TabsList>

         <TabsContent value="intelligence" className="space-y-8 animate-in fade-in">
             <div className="flex justify-end">
               <PrintTabButton
                 label="Print Intelligence"
                 onPrint={() => printIntelligenceReport({
                   deal,
                   metrics: displayMetrics,
                   propertyIntelligence: inputs.propertyIntelligence,
                   scenarioMode,
                   activeScenarioMetrics,
                 })}
               />
             </div>
             {/* 1+2. Combined layout: left 2/3 stacked, right 1/3 stacked (Deal Score → MAO → Market Gauge) */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                 {/* Left column: Financial Breakdown + Property Intelligence stacked */}
                 <div className="lg:col-span-2 space-y-6 min-w-0">
                    <ComprehensiveFinancialBreakdown deal={deal} metrics={displayMetrics} />
                    <PropertyIntelligenceSection 
                        inputs={inputs}
                        calculations={metrics}
                        onPropertyDataFetch={readOnly || !canEdit ? undefined : handlePropertyDataFetch}
                        propertyData={inputs.propertyIntelligence}
                        readOnly={readOnly}
                    />
                 </div>
                 {/* Right column: Deal Score (stretches to fill) → MAO → Market Strength Gauge */}
                 <div className="lg:col-span-1 flex flex-col gap-6 min-w-0 lg:sticky lg:top-4">
                     <DealQualityScore score={displayMetrics.score} riskLevel={displayMetrics.risk} />
                     <SeventyPercentRule
                       compact
                       deal={{
                         purchase_price: deal.purchasePrice || deal.purchase_price || 0,
                         ...deal
                       }}
                       metrics={{
                         arv: metrics?.arv || deal.arv || 0,
                         rehabCosts: metrics?.rehabCosts || metrics?.rehab?.total || deal.rehab_costs || deal.rehabCosts || 0,
                         ...metrics
                       }}
                     />
                     <MarketStrengthGauge deal={deal} propertyIntelligence={inputs.propertyIntelligence} />
                 </div>
             </div>

             {/* 3. Neighborhood & Location Intelligence */}
             <NeighborhoodIntelligenceCard
               inputs={inputs}
               propertyData={inputs.propertyIntelligence}
               initialData={inputs.neighborhoodIntelligence}
               onDataFetch={readOnly || !canEdit ? undefined : handleNeighborhoodDataFetch}
               readOnly={readOnly}
             />

             {/* 4. ARV Sensitivity Heat Map (left) */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2">
                    <ARVSensitivityHeatmap deal={deal} metrics={displayMetrics} />
                 </div>
             </div>

            {/* Always Visible Scenario Section */}
            <div className="pt-8 border-t border-border mt-8">
                <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-2">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Settings2 className="text-primary" /> Scenario Modeling
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={scenarioMode} onValueChange={setScenarioMode}>
                            <SelectTrigger className="w-[180px] bg-background border-input text-foreground">
                              <SelectValue placeholder="Select Scenario" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-foreground">
                              <SelectItem value="base">Base Case</SelectItem>
                              <SelectItem value="best">Best Case</SelectItem>
                              <SelectItem value="worst">Worst Case</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => recalculateScenario(deal, inputs, scenarioMode)}
                            className="border-border text-foreground hover:bg-accent gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Recalculate
                          </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                       {activeScenarioMetrics && (
                          <ScenarioComparison 
                             baseMetrics={metrics} 
                             scenarioMetrics={activeScenarioMetrics} 
                             scenarioName={scenarioMode === 'worst' ? 'Stress Test' : scenarioMode === 'base' ? 'Base Case' : scenarioMode === 'best' ? 'Best Case' : scenarioMode} 
                          />
                       )}
                    </CardContent>
                </Card>
            </div>
         </TabsContent>

         <TabsContent value="rehab-insights" className="space-y-8">
             <div className="flex justify-end gap-2">
               <PrintTabButton
                 label="Print"
                 onPrint={() => printRehabInsightsReport({
                   deal,
                   metrics: displayMetrics,
                   propertyIntelligence: inputs.propertyIntelligence,
                   sowData: inputs.rehabSow,
                   photos: deal.photos,
                 })}
               />
               <RehabInsightsExportButton 
                  deal={deal} 
                  metrics={displayMetrics} 
                  propertyIntelligence={inputs.propertyIntelligence}
                  sowData={inputs.rehabSow}
                  photos={deal.photos}
               />
             </div>
             <RehabPlanTab 
                deal={deal} 
                setDeal={readOnly || !canEdit ? () => {} : handleRehabDealUpdate} 
                isHighPotential={(metrics?.score ?? 0) >= 60}
                inputs={inputs}
                calculations={metrics}
                propertyData={inputs?.propertyIntelligence}
                onSowGenerated={readOnly || !canEdit ? undefined : handleSowGenerated}
                onApplyRehabCost={readOnly || !canEdit ? undefined : handleApplyRehabCost}
                onSowContextUpdated={readOnly || !canEdit ? undefined : handleSowContextUpdated}
                readOnly={readOnly}
             />
         </TabsContent>

         <TabsContent value="comps">
            <div className="flex justify-end mb-4">
              <PrintTabButton
                label="Print Comps"
                onPrint={() => printCompsReport({
                  comps: inputs.propertyIntelligence?.recentComps || deal.comps,
                  subjectAddress: deal?.address ?? inputs?.address ?? '',
                  subjectSpecs: (() => {
                    const pi = inputs?.propertyIntelligence;
                    const avm = pi?.avmSubject;
                    return avm && typeof avm === 'object'
                      ? { squareFootage: avm.squareFootage, bedrooms: avm.bedrooms, bathrooms: avm.bathrooms, yearBuilt: avm.yearBuilt, address: avm.address }
                      : pi
                        ? { squareFootage: pi.squareFootage, bedrooms: pi.bedrooms, bathrooms: pi.bathrooms, yearBuilt: pi.yearBuilt, address: pi.address }
                        : deal
                          ? { squareFootage: deal.sqft, bedrooms: deal.bedrooms, bathrooms: deal.bathrooms, yearBuilt: deal.yearBuilt, address: deal.address }
                          : undefined;
                  })(),
                  avmValue: inputs?.propertyIntelligence?.avmValue,
                })}
              />
            </div>
            <CompsDisplay 
               tableOnly
               comps={inputs.propertyIntelligence?.recentComps || deal.comps} 
               loading={false}
               onRefresh={() => { /* Trigger refresh in child */ }}
               onAddComp={canEdit ? handleAddComp : undefined}
               onSearchCompsWithAI={canEdit ? handleSearchCompsWithAI : undefined}
               compsSearching={compsSearching}
               source={inputs.propertyIntelligence?.recentComps?.length ? (inputs.propertyIntelligence?.source ?? "Realie/RentCast") : "Manual/Legacy"}
               subjectAddress={deal?.address ?? inputs?.address ?? ''}
               subjectLat={inputs.propertyIntelligence?.latitude ?? inputs.propertyIntelligence?.avmSubject?.latitude}
               subjectLng={inputs.propertyIntelligence?.longitude ?? inputs.propertyIntelligence?.avmSubject?.longitude}
               isMapVisible={activeTab === 'comps'}
               subjectSpecs={(() => {
                 const pi = inputs?.propertyIntelligence;
                 const avm = pi?.avmSubject;
                 return avm && typeof avm === 'object'
                   ? { squareFootage: avm.squareFootage, bedrooms: avm.bedrooms, bathrooms: avm.bathrooms, yearBuilt: avm.yearBuilt, address: avm.address }
                   : pi
                     ? { squareFootage: pi.squareFootage, bedrooms: pi.bedrooms, bathrooms: pi.bathrooms, yearBuilt: pi.yearBuilt, address: pi.address }
                     : deal
                       ? { squareFootage: deal.sqft, bedrooms: deal.bedrooms, bathrooms: deal.bathrooms, yearBuilt: deal.yearBuilt, address: deal.address }
                       : undefined;
               })()}
               avmValue={inputs?.propertyIntelligence?.avmValue}
            />
         </TabsContent>

         <TabsContent value="scenario-risk" className="space-y-8">
            <ScenarioRiskModel 
               deal={deal}
               metrics={displayMetrics}
               propertyIntelligence={inputs.propertyIntelligence}
            />
         </TabsContent>

         <TabsContent value="notes">
            <NotesPanel dealId={deal.id} initialNotes={deal.notes} readOnly={readOnly} sowContextMessages={deal.sowContextMessages} />
         </TabsContent>

         {!readOnly && (deal?.status === 'Funded' || deal?.status === 'Closed' || deal?.status === 'Completed' || deal?.isFunded || deal?.isClosed) && (
           <TabsContent value="project-mgmt">
             <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
               <div className="p-3 bg-accentBrand/10 rounded-xl w-fit mx-auto">
                 <Hammer className="w-8 h-8 text-accentBrand" />
               </div>
               <h2 className="text-xl font-bold text-foreground">Rehab Project Management</h2>
               <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                 Track tasks, budget vs actual, materials, photos, and issues for this active rehab.
               </p>
               <Button
                 onClick={() => navigate(`/project-management/deal?id=${deal.id}`)}
                 className="gap-2"
               >
                 <Hammer className="w-4 h-4" />
                 Open Project Dashboard
               </Button>
             </div>
           </TabsContent>
         )}
      </Tabs>

      {!readOnly && (
        <NavigationButtons 
          backPath="/deal-input" 
          nextPath={`/deal/action?id=${effectiveDealId}`}
          nextLabel="Go to Action Hub"
        />
      )}
      {!readOnly && (
        <EditDealModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} deal={deal} onSave={handleDealUpdate} />
      )}
      {!readOnly && (
        <DebugDashboard 
            formInputs={inputs}
            loadedData={loadedData}
            convertedInputs={inputs}
            calculations={metrics}
            propertyData={inputs.propertyIntelligence}
            rehabSOW={inputs.rehabSow}
        />
      )}
    </div>
  );
};

export default DealAnalysisPage;
