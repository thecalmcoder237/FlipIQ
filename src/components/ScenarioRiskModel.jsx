import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  Target, Zap, Clock, DollarSign, BarChart3, 
  Calculator, Shield
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  calculateExpectedValue, 
  calculateLossProbability, 
  calculateBreakEvenConfidence,
  generateProbabilityCurve,
  calculateRiskScore,
  identifyTopThreats,
  calculateMinARV,
  calculateTimelineCollision,
  calculateHiddenCosts
} from '@/utils/riskCalculations';
import { fetchMarketShockScenarios, applyMarketShock } from '@/services/marketShockService';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import { useToast } from '@/components/ui/use-toast';
import DealHealthRadar from '@/components/DealHealthRadar';

const ScenarioRiskModel = ({ deal, metrics = {}, propertyIntelligence }) => {
  const { toast } = useToast();
  
  // Assumption sliders
  const [rehabOverrun, setRehabOverrun] = useState(deal.rehabOverrunPercent || 15);
  const [holdTime, setHoldTime] = useState(deal.holdingMonths || 6);
  const [arvShift, setArvShift] = useState(0);
  const [targetProfit, setTargetProfit] = useState(50000);
  
  // Adjustable risk factors
  const [marketShockEnabled, setMarketShockEnabled] = useState({ rateSpike: false, demandDrop: false, constructionInflation: false, regulatory: false });
  const [hiddenCostEnabled, setHiddenCostEnabled] = useState({});
  const [timelineRiskEnabled, setTimelineRiskEnabled] = useState({ permitDelay: false, contractorDelay: false, inspectionDelay: false });
  
  // State
  const [scenarios, setScenarios] = useState([]);
  const [marketShocks, setMarketShocks] = useState(null);
  const [hiddenCosts, setHiddenCosts] = useState([]);
  const [timelineRisks, setTimelineRisks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showARVSolver, setShowARVSolver] = useState(true); // Show by default at top


  // Calculate scenarios based on assumptions
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:51',message:'useEffect: Calculate scenarios',data:{hasDeal:!!deal,hasMetrics:!!metrics,metricsType:typeof metrics,metricsKeys:metrics?Object.keys(metrics):[],rehabOverrun,holdTime,arvShift},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!deal) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:55',message:'useEffect: Early return - no deal',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    // Ensure metrics exists, use empty object if not
    const safeMetrics = metrics || {};
    
    const baseDeal = { ...deal, rehabOverrunPercent: rehabOverrun, holdingMonths: holdTime, arvShift };
    
    // Generate scenarios with probability weights
    const newScenarios = [
      {
        name: 'Best Case',
        probability: 20,
        profit: calculateScenarioProfit(baseDeal, safeMetrics, -10, -1, 5),
        rehabOverrun: -10,
        holdTime: -1,
        arvShift: 5
      },
      {
        name: 'Most Likely',
        probability: 50,
        profit: calculateScenarioProfit(baseDeal, safeMetrics, rehabOverrun, 0, 0),
        rehabOverrun: rehabOverrun,
        holdTime: 0,
        arvShift: 0
      },
      {
        name: 'Worst Case',
        probability: 30,
        profit: calculateScenarioProfit(baseDeal, safeMetrics, 30, 3, -10),
        rehabOverrun: 30,
        holdTime: 3,
        arvShift: -10
      }
    ];
    
    setScenarios(newScenarios);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:126',message:'Scenarios set',data:{scenariosCount:newScenarios.length,scenarioProfits:newScenarios.map(s=>s.profit)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Calculate hidden costs
    const costs = calculateHiddenCosts(baseDeal, propertyIntelligence);
    setHiddenCosts(costs);
    
    // Initialize hidden cost enabled state
    const costEnabled = {};
    costs.forEach(cost => {
      costEnabled[cost.name] = false;
    });
    setHiddenCostEnabled(costEnabled);
    
    // Calculate timeline risks
    const yearBuilt = propertyIntelligence?.yearBuilt || deal.yearBuilt || 2000;
    const timelineRisk = {
      permitDelay: {
        probability: yearBuilt < 1980 ? 65 : 45,
        days: yearBuilt < 1980 ? 22 : 15,
        cost: (yearBuilt < 1980 ? 22 : 15) * 50 * (holdTime / 6)
      },
      contractorDelay: {
        probability: 40,
        days: 7,
        cost: 7 * 50 * (holdTime / 6)
      },
      inspectionDelay: {
        probability: 25,
        days: 5,
        cost: 5 * 50 * (holdTime / 6)
      }
    };
    setTimelineRisks(timelineRisk);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:159',message:'useEffect completed',data:{scenariosSet:true,hiddenCostsCount:costs.length,timelineRisksSet:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }, [deal, metrics, rehabOverrun, holdTime, arvShift, propertyIntelligence]);

  // Fetch market shocks
  useEffect(() => {
    if (!deal?.address || !deal?.zipCode) return;
    
    setLoading(true);
    fetchMarketShockScenarios(deal.address, deal.zipCode, deal.propertyType || 'Single-Family')
      .then(data => {
        setMarketShocks(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Market shock fetch error:', error);
        setLoading(false);
      });
  }, [deal]);

  // Helper function to calculate scenario profit (moved outside useEffect for reuse)
  function calculateScenarioProfit(baseDeal, baseMetrics, overrun, holdAdjust, arvAdjust) {
    if (!baseMetrics) return 0;
    // Apply ARV shift to the actual ARV value
    const baseARV = baseDeal.arv || metrics?.arv || 0;
    const adjustedARV = baseARV * (1 + (arvAdjust / 100));
    
    const adjustedDeal = {
      ...baseDeal,
      arv: adjustedARV, // Apply ARV shift directly to ARV
      rehabOverrunPercent: overrun,
      holdingMonths: (baseDeal.holdingMonths || 6) + holdAdjust,
      arvShift: arvAdjust // Keep for reference
    };
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:153',message:'Calculating scenario profit',data:{baseARV,adjustedARV,arvAdjust,overrun,holdAdjust,holdingMonths:adjustedDeal.holdingMonths},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    const adjustedMetrics = calculateDealMetrics(adjustedDeal);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:153',message:'Scenario profit calculated',data:{netProfit:adjustedMetrics?.netProfit,adjustedARV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    return adjustedMetrics?.netProfit || 0;
  }

  // Calculate derived metrics
  const expectedProfit = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:142',message:'Calculating expectedProfit',data:{scenariosCount:scenarios.length,scenarios:scenarios.map(s=>({name:s.name,profit:s.profit,prob:s.probability}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!scenarios || scenarios.length === 0) return 0;
    const result = calculateExpectedValue(scenarios);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:142',message:'expectedProfit calculated',data:{expectedProfit:result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return result || 0;
  }, [scenarios]);
  const lossProb = useMemo(() => calculateLossProbability(scenarios), [scenarios]);
  const breakEvenConf = useMemo(() => calculateBreakEvenConfidence(scenarios), [scenarios]);
  const riskScore = useMemo(() => calculateRiskScore(deal, metrics, scenarios), [deal, metrics, scenarios]);
  const topThreats = useMemo(() => identifyTopThreats(deal, metrics, scenarios, hiddenCosts, timelineRisks), 
    [deal, metrics, scenarios, hiddenCosts, timelineRisks]);
  const probabilityCurve = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:182',message:'Generating probability curve',data:{scenariosCount:scenarios.length,scenarios:scenarios.map(s=>({name:s.name,profit:s.profit,prob:s.probability}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    const curve = generateProbabilityCurve(scenarios);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:182',message:'Probability curve generated',data:{curvePoints:curve.length,firstPoint:curve[0],lastPoint:curve[curve.length-1]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    return curve;
  }, [scenarios]);
  const timelineCollision = useMemo(() => calculateTimelineCollision(timelineRisks), [timelineRisks]);
  const minARV = useMemo(() => calculateMinARV(deal, metrics, targetProfit), [deal, metrics, targetProfit]);

  // Calculate adjusted profit with all risk factors (must be after expectedProfit is defined)
  const calculateAdjustedProfit = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:163',message:'Calculating adjusted profit',data:{expectedProfit,hasDeal:!!deal,hasMetrics:!!metrics,expectedProfitType:typeof expectedProfit,expectedProfitValue:expectedProfit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (!deal || !metrics) return 0;
    const baseProfit = expectedProfit || 0;
    
    let adjustedProfit = baseProfit;
    
    // Apply market shocks if enabled
    if (marketShocks && marketShockEnabled) {
      Object.entries(marketShockEnabled).forEach(([key, enabled]) => {
        if (enabled && marketShocks[key]) {
          const shock = marketShocks[key];
          if (shock.impactROI) {
            adjustedProfit = adjustedProfit * (1 + shock.impactROI / 100);
          }
        }
      });
    }
    
    // Apply hidden costs if enabled
    if (hiddenCosts && hiddenCostEnabled) {
      Object.entries(hiddenCostEnabled).forEach(([key, enabled]) => {
        if (enabled) {
          const cost = hiddenCosts.find(c => c.name === key);
          if (cost) {
            adjustedProfit -= cost.impact * (cost.probability / 100);
          }
        }
      });
    }
    
    // Apply timeline risks if enabled
    if (timelineCollision && timelineRiskEnabled) {
      Object.entries(timelineRiskEnabled).forEach(([key, enabled]) => {
        if (enabled && timelineRisks?.[key]) {
          const risk = timelineRisks[key];
          adjustedProfit -= risk.cost * (risk.probability / 100);
        }
      });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:201',message:'Adjusted profit calculated',data:{adjustedProfit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return adjustedProfit;
  }, [deal, metrics, expectedProfit, marketShocks, marketShockEnabled, hiddenCosts, hiddenCostEnabled, timelineCollision, timelineRiskEnabled, timelineRisks]);

  // Helper function to calculate scenario profit
  function calculateScenarioProfit(baseDeal, baseMetrics, overrun, holdAdjust, arvAdjust) {
    const adjustedDeal = {
      ...baseDeal,
      rehabOverrunPercent: overrun,
      holdingMonths: (baseDeal.holdingMonths || 6) + holdAdjust,
      arvShift: arvAdjust
    };
    
    const adjustedMetrics = calculateDealMetrics(adjustedDeal);
    return adjustedMetrics?.netProfit || 0;
  }

  const riskColor = riskScore < 30 ? 'text-green-400' : riskScore < 60 ? 'text-yellow-400' : 'text-red-400';
  const riskBgColor = riskScore < 30 ? 'bg-green-500/20' : riskScore < 60 ? 'bg-yellow-500/20' : 'bg-red-500/20';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-purple-600" />
            Scenario Risk Model
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Dynamic probability-weighted risk analysis with market shock scenarios
          </p>
        </div>
      </div>

      {/* 1. ARV Solver - At Top */}
      <Card className="bg-white border-purple-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Target className="text-purple-600" />
            Minimum ARV Calculator
          </CardTitle>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setShowARVSolver(!showARVSolver)}
            className="text-gray-600 hover:text-gray-900"
          >
            {showARVSolver ? 'Hide' : 'Show'}
          </Button>
        </CardHeader>
        {showARVSolver && (
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 mb-2">Target Profit</p>
              <Slider
                value={[targetProfit]}
                onValueChange={([val]) => setTargetProfit(val)}
                min={0}
                max={200000}
                step={5000}
                className="mb-2"
              />
              <p className="text-lg font-bold text-gray-900">${targetProfit.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-1">Minimum ARV Needed</p>
              <p className="text-3xl font-bold text-purple-600">{minARV.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-2">
                Current ARV: {(metrics?.arv || 0).toLocaleString()} | 
                Difference: {((metrics?.arv || 0) - minARV).toLocaleString()}
              </p>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>• Purchase Price: {(deal.purchasePrice || deal.purchase_price || 0).toLocaleString()}</p>
              <p>• Rehab (with {rehabOverrun}% overrun): {Math.round((metrics?.rehab?.total || 0) * (1 + rehabOverrun/100)).toLocaleString()}</p>
              <p>• Holding ({holdTime} months): {Math.round((metrics?.holding?.total || 0) * (holdTime / (deal.holdingMonths || 6))).toLocaleString()}</p>
              <p>• All Costs + Target Profit = {minARV.toLocaleString()}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. Adjust Assumptions (left) + Probability Curve (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Assumption Sliders */}
        <div className="space-y-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg">Adjust Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rehab Overrun Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Rehab Overrun %</label>
                  <span className="text-lg font-bold text-gray-900">{rehabOverrun}%</span>
                </div>
                <Slider
                  value={[rehabOverrun]}
                  onValueChange={([val]) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:332',message:'Rehab Overrun slider changed',data:{oldValue:rehabOverrun,newValue:val},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
                    // #endregion
                    setRehabOverrun(val);
                  }}
                  min={0}
                  max={50}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-gray-600">
                  Estimated cost overrun: +{Math.round((metrics?.rehab?.total || 0) * (rehabOverrun / 100)).toLocaleString()}
                </p>
              </div>

              {/* Hold Time Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Hold Time (Months)</label>
                  <span className="text-lg font-bold text-gray-900">{holdTime} months</span>
                </div>
                <Slider
                  value={[holdTime]}
                  onValueChange={([val]) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:351',message:'Hold Time slider changed',data:{oldValue:holdTime,newValue:val},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
                    // #endregion
                    setHoldTime(val);
                  }}
                  min={3}
                  max={12}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-gray-600">
                  Additional holding cost: {Math.round((metrics?.holding?.total || 0) * ((holdTime - (deal.holdingMonths || 6)) / (deal.holdingMonths || 6))).toLocaleString()}
                </p>
              </div>

              {/* ARV Shift Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">ARV Shift %</label>
                  <span className={`text-lg font-bold ${arvShift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {arvShift >= 0 ? '+' : ''}{arvShift}%
                  </span>
                </div>
                <Slider
                  value={[arvShift]}
                  onValueChange={([val]) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/2f41b995-a6ad-4446-a2d3-910377beb16b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ScenarioRiskModel.jsx:372',message:'ARV Shift slider changed',data:{oldValue:arvShift,newValue:val},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
                    // #endregion
                    setArvShift(val);
                  }}
                  min={-20}
                  max={10}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-gray-600">
                  ARV impact: {arvShift >= 0 ? '+' : ''}{Math.round((metrics?.arv || 0) * (arvShift / 100)).toLocaleString()}
                </p>
              </div>

              {/* Most Likely Outcome Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-6">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Most Likely Outcome
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Expected Net Profit</span>
                    <span className={`text-sm font-bold ${expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.round(expectedProfit).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Adjusted Profit (with risks)</span>
                    <span className={`text-sm font-bold ${calculateAdjustedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.round(calculateAdjustedProfit).toLocaleString()}
                    </span>
                  </div>
                  {Math.abs(calculateAdjustedProfit - expectedProfit) > 100 && (
                    <div className="flex justify-between pt-1 border-t border-gray-200">
                      <span className="text-xs text-gray-600">Risk Impact</span>
                      <span className={`text-xs font-bold ${(calculateAdjustedProfit - expectedProfit) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {calculateAdjustedProfit - expectedProfit >= 0 ? '+' : ''}${Math.round(calculateAdjustedProfit - expectedProfit).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Probability of Loss</span>
                    <span className="text-sm font-bold text-red-600">{lossProb.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Break-Even Confidence</span>
                    <span className="text-sm font-bold text-green-600">{breakEvenConf.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deal Health Radar - Replace Risk Thermometer */}
          <DealHealthRadar deal={deal} metrics={metrics || {}} propertyIntelligence={propertyIntelligence} />
        </div>

        {/* RIGHT PANEL: Visualizations */}
        <div className="space-y-4">
          {/* Probability Curve */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                Probability Curve: % Chance of Profit &gt; X
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={probabilityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="profit" 
                      stroke="#6b7280" 
                      tickFormatter={(val) => `$${val/1000}k`}
                      fontSize={10}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      tickFormatter={(val) => `${val}%`}
                      fontSize={10}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
                      formatter={(value) => [`${value}%`, 'Probability']}
                      labelFormatter={(label) => `Profit: $${label.toLocaleString()}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="probability" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-gray-600">
                Based on {scenarios.length} scenarios with probability-weighted outcomes
              </div>
            </CardContent>
          </Card>

          {/* Top 3 Threats */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <AlertTriangle className="text-red-600" />
                Top 3 Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topThreats.map((threat, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      threat.severity === 'high' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-gray-900">
                        {idx + 1}. {threat.name}
                      </span>
                      <span className="text-xs font-bold text-red-600">
                        {threat.probability.toFixed(0)}% prob
                      </span>
                    </div>
                    <p className="text-xs text-gray-700">
                      → {threat.impact}
                    </p>
                  </div>
                ))}
                {topThreats.length === 0 && (
                  <p className="text-sm text-gray-600 text-center py-4">
                    No significant threats identified
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 3. Adjustable Risk Factors: Market Shocks, Hidden Costs, Timeline Collision */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Shock Scenarios - Adjustable */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
              <Zap className="text-yellow-600" />
              Market Shock Scenarios
            </CardTitle>
            <p className="text-xs text-gray-600 mt-1">Toggle to apply to profit calculation</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketShocks && Object.entries(marketShocks).filter(([key]) => key !== 'aiInsight').map(([key, shock]) => (
              <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={marketShockEnabled[key] || false}
                      onChange={(e) => setMarketShockEnabled(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-yellow-600">
                    {shock.probability}% prob
                  </span>
                </div>
                {shock.impactHoldingCost && (
                  <p className="text-xs text-gray-600">Holding cost: +{shock.impactHoldingCost}%</p>
                )}
                {shock.impactROI && (
                  <p className="text-xs text-gray-600">ROI impact: {shock.impactROI > 0 ? '+' : ''}{shock.impactROI}%</p>
                )}
                {shock.impactDOM && (
                  <p className="text-xs text-gray-600">DOM: +{shock.impactDOM} days</p>
                )}
                {shock.impactSalePrice && (
                  <p className="text-xs text-gray-600">Sale price: {shock.impactSalePrice}%</p>
                )}
                {marketShockEnabled[key] && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Applied to profit calculation</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Source: {shock.dataSource}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hidden Cost Radar - Adjustable */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
              <DollarSign className="text-purple-600" />
              Hidden Cost Radar
            </CardTitle>
            <p className="text-xs text-gray-600 mt-1">Toggle to apply to profit calculation</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {hiddenCosts.map((cost, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hiddenCostEnabled[cost.name] || false}
                      onChange={(e) => setHiddenCostEnabled(prev => ({ ...prev, [cost.name]: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{cost.name}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-600">
                    {cost.probability.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Impact: +${cost.impact.toLocaleString()}
                </p>
                {cost.probability > cost.baseProb && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ↑ Elevated risk (base: {cost.baseProb}%)
                  </p>
                )}
                {hiddenCostEnabled[cost.name] && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Applied to profit calculation</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline Collision Analyzer - Adjustable */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
              <Clock className="text-orange-600" />
              Timeline Collision Risk
            </CardTitle>
            <p className="text-xs text-gray-600 mt-1">Toggle individual risks to apply to profit</p>
          </CardHeader>
          <CardContent>
            {timelineCollision ? (
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">30+ Day Delay Probability</p>
                  <p className="text-lg font-bold text-orange-600">
                    {timelineCollision.probability30Plus.toFixed(1)}%
                  </p>
                </div>
                {timelineRisks && Object.entries(timelineRisks).map(([key, risk]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={timelineRiskEnabled[key] || false}
                        onChange={(e) => setTimelineRiskEnabled(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 bg-white text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-xs font-bold text-orange-600 ml-auto">
                        {risk.probability}% prob
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      +{risk.days} days, +${Math.round(risk.cost).toLocaleString()}
                    </p>
                    {timelineRiskEnabled[key] && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Applied to profit calculation</p>
                    )}
                  </div>
                ))}
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Total ROI Impact</p>
                  <p className="text-sm font-bold text-red-400">
                    -{timelineCollision.roiImpact.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {timelineCollision.probability30Plus > 40 
                      ? "⚠️ High risk of significant delays"
                      : "✅ Manageable delay risk"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Calculating timeline risks...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScenarioRiskModel;
