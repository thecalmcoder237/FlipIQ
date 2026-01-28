
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { BarChart3, Hammer, Home, FileText, Share2, Sparkles, Building2, Table as TableIcon, Settings2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateDealMetrics } from '@/utils/dealCalculations';
import { applyScenarioAdjustments } from '@/utils/advancedDealCalculations';
import { dealService } from '@/services/dealService';
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
import SOWBudgetComparison from '@/components/SOWBudgetComparison';
import PhotoUploadSection from '@/components/PhotoUploadSection';
import ScenarioRiskModel from '@/components/ScenarioRiskModel';
import ARVSensitivityHeatmap from '@/components/ARVSensitivityHeatmap';
import MarketStrengthGauge from '@/components/MarketStrengthGauge';
import SeventyPercentRule from '@/components/SeventyPercentRule';
import DebugDashboard from '@/components/DebugDashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DealAnalysisPage = () => {
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // State
  const [deal, setDeal] = useState(null);
  const [inputs, setInputs] = useState(null);
  const [metrics, setMetrics] = useState(null);
  
  // Debug State
  const [loadedData, setLoadedData] = useState(null);
  
  // Scenarios (Always Active)
  const [activeScenarioMetrics, setActiveScenarioMetrics] = useState(null);
  const [scenarioMode, setScenarioMode] = useState('worst'); // Default to 'Stress Test' view

  // Loading States
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!dealId) {
       logDataFlow('ERROR_MISSING_DEAL_ID', {}, new Date());
       navigate('/deal-input');
       return;
    }
    
    logDataFlow('DEAL_ID_FROM_URL', dealId, new Date());
    
    if (currentUser) {
       fetchDeal();
    }
  }, [dealId, currentUser]);

  const fetchDeal = async () => {
    try {
      setLoading(true);
      const loadedInputs = await dealService.loadDeal(dealId, currentUser.id);
      
      logDataFlow('LOADED_FROM_DB', loadedInputs, new Date());
      setLoadedData(loadedInputs);

      if (!loadedInputs) {
        throw new Error("Deal data could not be loaded");
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

  // Automatically calculate scenario whenever metrics or mode changes
  useEffect(() => {
    if (!deal || !scenarioMode) return;

    let adjustments = {
        rehabOverrunPercent: 0,
        holdingPeriodAdjustment: 0,
        marketAppreciationPercent: 0,
        permitDelayDays: 0
    };

    if (scenarioMode === 'best') {
      adjustments = { rehabOverrunPercent: -10, holdingPeriodAdjustment: -1, marketAppreciationPercent: 5, permitDelayDays: 0 };
    } else if (scenarioMode === 'worst') {
      adjustments = { rehabOverrunPercent: 25, holdingPeriodAdjustment: 3, marketAppreciationPercent: -10, permitDelayDays: 0 };
    } else if (scenarioMode === 'base') {
      // Base case is essentially 0 adjustments, same as current metrics
      adjustments = { rehabOverrunPercent: 0, holdingPeriodAdjustment: 0, marketAppreciationPercent: 0, permitDelayDays: 0 };
    }

    const results = applyScenarioAdjustments(deal, adjustments);
    
    // Add risk label based on recalculated score (if applyScenarioAdjustments calculated it, otherwise approximate)
    // The util returns basic props. We can add a simple risk label.
    // Ideally calculateDealQualityScore should be called here too, but for now we trust the basic props.
    results.risk = results.roi < 10 ? 'High' : results.roi < 15 ? 'Medium' : 'Low';
    
    setActiveScenarioMetrics(results);

  }, [deal, metrics, scenarioMode]);

  const handlePropertyDataFetch = async (data) => {
      const updatedInputs = { ...inputs, propertyIntelligence: data };
      setInputs(updatedInputs);
      setDeal(updatedInputs);
      
      try {
         await dealService.saveDeal(updatedInputs, currentUser.id);
      } catch (error) {
         console.error("Failed to save property intel", error);
      }
  };

  const handleSowGenerated = async (sowText) => {
      const updatedInputs = { ...inputs, rehabSow: sowText };
      setInputs(updatedInputs);
      setDeal(updatedInputs);

      try {
         await dealService.saveDeal(updatedInputs, currentUser.id);
      } catch (error) {
         console.error("Failed to save SOW", error);
      }
  };

  const handleDealUpdate = (updatedDeal) => {
    setDeal(updatedDeal);
    setInputs(updatedDeal);
    setMetrics(calculateDealMetrics(updatedDeal));
  };

  if (loading) return <div className="text-gray-900 text-center p-10">Loading analysis...</div>;
  if (!deal) return <div className="text-gray-900 text-center p-10">Deal not found.</div>;

  // We display the Base Metrics in the top cards, but the Scenario section below allows comparison.
  // The summary card usually shows "Current Plan".
  const displayMetrics = metrics || {};

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-7xl mx-auto mb-20">
      <Helmet><title>Deal Analysis - {deal.address} | FlipIQ</title></Helmet>
      <Breadcrumb />
      <ProgressIndicator />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Deal Analysis</h1>
        <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-gray-700 border-blue-500 hover:bg-blue-50"
              onClick={() => navigate(`/deal/action?id=${dealId}`)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Action Hub
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-700 hover:bg-gray-100"><Share2/></Button>
            <ExportAnalysisButton 
               deal={deal} 
               metrics={displayMetrics} 
               propertyIntelligence={inputs.propertyIntelligence}
               sowData={inputs.rehabSow}
            />
        </div>
      </div>

      <DealSummaryCard deal={deal} metrics={displayMetrics} onEdit={() => setIsEditModalOpen(true)} />

      <Tabs defaultValue="intelligence" className="mt-8">
         <TabsList className="bg-white border border-gray-200 p-1 mb-6 flex flex-wrap h-auto shadow-sm">
            <TabsTrigger value="intelligence" className="gap-2"><BarChart3 size={16}/> Intelligence</TabsTrigger>
            <TabsTrigger value="rehab-insights" className="gap-2"><Sparkles size={16}/> Rehab Insights</TabsTrigger>
            <TabsTrigger value="comps" className="gap-2"><Home size={16}/> Comps</TabsTrigger>
            <TabsTrigger value="scenario-risk" className="gap-2"><Shield size={16}/> Scenario Risk Model</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2"><FileText size={16}/> Notes</TabsTrigger>
         </TabsList>

         <TabsContent value="intelligence" className="space-y-8 animate-in fade-in">
             {/* 1. Detailed Cost Break (left) - Deal Quality Score (right) */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2">
                    <ComprehensiveFinancialBreakdown deal={deal} metrics={displayMetrics} />
                 </div>
                 <div className="lg:col-span-1">
                     <DealQualityScore score={displayMetrics.score} riskLevel={displayMetrics.risk} />
                 </div>
             </div>

             {/* 2. Property Intelligence - Market Strength Gauge (right) */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2">
                    <PropertyIntelligenceSection 
                        inputs={inputs}
                        calculations={metrics}
                        onPropertyDataFetch={handlePropertyDataFetch}
                        propertyData={inputs.propertyIntelligence}
                    />
                 </div>
                 <div className="lg:col-span-1">
                     <MarketStrengthGauge deal={deal} propertyIntelligence={inputs.propertyIntelligence} />
                 </div>
             </div>

             {/* 3. 70% Rule Analysis */}
             <Card className="bg-white border-gray-200 shadow-sm">
               <CardContent className="pt-6">
                 <SeventyPercentRule 
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
               </CardContent>
             </Card>

             {/* 4. ARV Sensitivity Heat Map (left) */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2">
                    <ARVSensitivityHeatmap deal={deal} metrics={displayMetrics} />
                 </div>
             </div>

            {/* Always Visible Scenario Section */}
            <div className="pt-8 border-t border-gray-200 mt-8">
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Settings2 className="text-purple-600" /> Scenario Modeling
                        </CardTitle>
                        <Select value={scenarioMode} onValueChange={setScenarioMode}>
                          <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
                            <SelectValue placeholder="Select Scenario" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-gray-900">
                            <SelectItem value="base">Base Case</SelectItem>
                            <SelectItem value="best">Best Case</SelectItem>
                            <SelectItem value="worst">Worst Case</SelectItem>
                          </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                       {activeScenarioMetrics && (
                          <ScenarioComparison 
                             baseMetrics={metrics} 
                             scenarioMetrics={activeScenarioMetrics} 
                             scenarioName={scenarioMode === 'worst' ? 'Stress Test' : scenarioMode} 
                          />
                       )}
                    </CardContent>
                </Card>
            </div>
         </TabsContent>

         <TabsContent value="rehab-insights" className="space-y-8">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold text-gray-900">Rehab & Property Insights</h2>
               <RehabInsightsExportButton 
                  deal={deal} 
                  metrics={displayMetrics} 
                  propertyIntelligence={inputs.propertyIntelligence}
                  sowData={inputs.rehabSow}
                  photos={deal.photos}
               />
             </div>
             
             {/* 1. Property Specifications - First Section */}
             {inputs.propertyIntelligence && (
               <Card className="bg-white border-gray-200 shadow-sm">
                 <CardHeader>
                   <CardTitle className="flex gap-2 items-center text-gray-900">
                     <Building2 className="text-blue-600"/> Property Specifications
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(inputs.propertyIntelligence).map(([key, val]) => {
                       if(key === 'recentComps' || typeof val === 'object' || val === null) return null;
                       return (
                         <div key={key} className="p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm font-bold text-gray-900">{val}</p>
                         </div>
                       );
                    })}
                 </CardContent>
               </Card>
             )}

             {/* 2. Site Upload Pictures - Second Section */}
             <PhotoUploadSection deal={deal} onPhotosUpdated={(newPhotos) => {
               const updatedDeal = { ...deal, photos: newPhotos };
               setDeal(updatedDeal);
               setInputs(updatedDeal);
             }} />

             {/* 3. Generated SOW - Third Section */}
             <RehabSOWSection 
                 inputs={inputs}
                 deal={deal}
                 calculations={metrics}
                 propertyData={inputs.propertyIntelligence}
                 savedSow={inputs.rehabSow}
                 onSowGenerated={handleSowGenerated}
             />

             {/* 4. SOW vs Budget Comparison */}
             {inputs.rehabSow && (
               <SOWBudgetComparison 
                 sowText={inputs.rehabSow}
                 currentBudget={inputs.rehabCosts}
                 deal={deal}
               />
             )}
         </TabsContent>

         <TabsContent value="comps">
            <CompsDisplay 
               comps={inputs.propertyIntelligence?.recentComps || deal.comps} 
               loading={false}
               onRefresh={() => { /* Trigger refresh in child */ }}
               source={inputs.propertyIntelligence ? "AI Intelligence" : "Manual/Legacy"}
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
            <NotesPanel dealId={deal.id} initialNotes={deal.notes} />
         </TabsContent>
      </Tabs>

      <NavigationButtons 
        backPath="/deal-input" 
        nextPath={`/deal/action?id=${dealId}`}
        nextLabel="Go to Action Hub"
      />
      <EditDealModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} deal={deal} onSave={handleDealUpdate} />
      
      <DebugDashboard 
          formInputs={inputs}
          loadedData={loadedData}
          convertedInputs={inputs}
          calculations={metrics}
          propertyData={inputs.propertyIntelligence}
          rehabSOW={inputs.rehabSow}
      />
    </div>
  );
};

export default DealAnalysisPage;
