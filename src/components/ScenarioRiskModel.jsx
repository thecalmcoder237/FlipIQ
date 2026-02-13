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
    if (!deal) return;
    
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
        profit: calculateScenarioProfit(baseDeal, safeMetrics, rehabOverrun, 0, arvShift),
        rehabOverrun: rehabOverrun,
        holdTime: 0,
        arvShift: arvShift
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

  // Single helper: apply rehab overrun, hold adjustment, and ARV % shift; recalc metrics and return net profit
  function calculateScenarioProfit(baseDeal, baseMetrics, overrun, holdAdjust, arvAdjust) {
    if (!baseDeal) return 0;
    const baseARV = baseDeal.arv ?? baseMetrics?.arv ?? 0;
    const adjustedARV = baseARV * (1 + (arvAdjust / 100));
    const adjustedDeal = {
      ...baseDeal,
      arv: adjustedARV,
      rehabOverrunPercent: overrun,
      holdingMonths: Math.max(1, (baseDeal.holdingMonths || 6) + holdAdjust),
    };
    const adjustedMetrics = calculateDealMetrics(adjustedDeal);
    return adjustedMetrics?.netProfit ?? 0;
  }

  // Calculate derived metrics
  const expectedProfit = useMemo(() => {
    if (!scenarios || scenarios.length === 0) return 0;
    return calculateExpectedValue(scenarios) || 0;
  }, [scenarios]);
  const lossProb = useMemo(() => calculateLossProbability(scenarios), [scenarios]);
  const riskScore = useMemo(() => calculateRiskScore(deal, metrics, scenarios), [deal, metrics, scenarios]);
  const topThreats = useMemo(() => identifyTopThreats(deal, metrics, scenarios, hiddenCosts, timelineRisks), 
    [deal, metrics, scenarios, hiddenCosts, timelineRisks]);
  const probabilityCurve = useMemo(() => generateProbabilityCurve(scenarios), [scenarios]);
  const timelineCollision = useMemo(() => calculateTimelineCollision(timelineRisks), [timelineRisks]);
  const minARV = useMemo(() => calculateMinARV(deal, metrics, targetProfit), [deal, metrics, targetProfit]);

  // Adjusted profit = Expected profit minus impact of risks that are TOGGLED ON only
  const adjustedProfit = useMemo(() => {
    const baseProfit = expectedProfit || 0;
    let drag = 0;

    // Market shocks: only include when toggle is ON
    if (marketShocks) {
      Object.entries(marketShocks).forEach(([key, shock]) => {
        if (!marketShockEnabled[key]) return;
        if (shock && typeof shock === 'object' && shock.probability != null && shock.impactROI != null) {
          const probPct = (shock.probability || 0) / 100;
          const roiImpactPct = (shock.impactROI || 0) / 100;
          drag += baseProfit * (-roiImpactPct) * probPct;
        }
      });
    }

    // Hidden costs: only include when toggle is ON
    (hiddenCosts || []).forEach((cost) => {
      if (!hiddenCostEnabled[cost.name]) return;
      drag += (cost.impact || 0) * ((cost.probability || 0) / 100);
    });

    // Timeline risks: only include when toggle is ON
    if (timelineRisks) {
      Object.entries(timelineRisks).forEach(([key, risk]) => {
        if (!timelineRiskEnabled[key]) return;
        if (risk && risk.cost != null && risk.probability != null) {
          drag += (risk.cost || 0) * ((risk.probability || 0) / 100);
        }
      });
    }

    return baseProfit - drag;
  }, [expectedProfit, marketShocks, hiddenCosts, timelineRisks, marketShockEnabled, hiddenCostEnabled, timelineRiskEnabled]);

  // Display: break-even confidence = 100 - probability of loss (aligned)
  const breakEvenDisplay = useMemo(() => Math.round((100 - lossProb) * 10) / 10, [lossProb]);

  const riskColor = riskScore < 30 ? 'text-green-400' : riskScore < 60 ? 'text-yellow-400' : 'text-red-400';
  const riskBgColor = riskScore < 30 ? 'bg-green-500/20' : riskScore < 60 ? 'bg-yellow-500/20' : 'bg-red-500/20';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="text-primary shrink-0" />
            <span className="break-words">Scenario Risk Model</span>
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Dynamic probability-weighted risk analysis with market shock scenarios
          </p>
        </div>
      </div>

      {/* 1. ARV Solver - At Top */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="text-primary" />
            Minimum ARV Calculator
          </CardTitle>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setShowARVSolver(!showARVSolver)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showARVSolver ? 'Hide' : 'Show'}
          </Button>
        </CardHeader>
        {showARVSolver && (
          <CardContent className="space-y-4">
            <div className="bg-muted p-3 md:p-4 rounded-lg border border-border">
              <p className="text-xs md:text-sm text-foreground mb-2">Target Profit</p>
              <Slider
                value={[targetProfit]}
                onValueChange={([val]) => setTargetProfit(val)}
                min={0}
                max={200000}
                step={5000}
                className="mb-2"
              />
              <p className="text-base md:text-lg font-bold text-foreground break-all">${targetProfit.toLocaleString()}</p>
            </div>
            <div className="bg-primary/10 border border-primary/30 p-3 md:p-4 rounded-lg">
              <p className="text-xs md:text-sm text-foreground mb-1">Minimum ARV Needed</p>
              <p className="text-2xl md:text-3xl font-bold text-primary break-all">{minARV.toLocaleString()}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-2 break-words">
                Current ARV: {(metrics?.arv || 0).toLocaleString()} | 
                Difference: {((metrics?.arv || 0) - minARV).toLocaleString()}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1 italic">
                Based on base deal only — not linked to sliders below
              </p>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground space-y-1">
              <p className="break-words">• Purchase Price: {(deal.purchasePrice || deal.purchase_price || 0).toLocaleString()}</p>
              <p className="break-words">• Rehab (base): {Math.round(metrics?.rehab?.total || 0).toLocaleString()}</p>
              <p className="break-words">• Holding ({deal.holdingMonths || deal.holding_months || 6} months): {Math.round(metrics?.holding?.total || 0).toLocaleString()}</p>
              <p className="break-words">• All Costs + Target Profit = {minARV.toLocaleString()}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. Adjust Assumptions (left) + Probability Curve (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Assumption Sliders */}
        <div className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Adjust Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rehab Overrun Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-foreground">Rehab Overrun %</label>
                  <span className="text-lg font-bold text-foreground">{rehabOverrun}%</span>
                </div>
                <Slider
                  value={[rehabOverrun]}
                  onValueChange={([val]) => setRehabOverrun(val)}
                  min={0}
                  max={50}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  Estimated cost overrun: +{Math.round((metrics?.rehab?.total || 0) * (rehabOverrun / 100)).toLocaleString()}
                </p>
              </div>

              {/* Hold Time Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-foreground">Hold Time (Months)</label>
                  <span className="text-lg font-bold text-foreground">{holdTime} months</span>
                </div>
                <Slider
                  value={[holdTime]}
                  onValueChange={([val]) => setHoldTime(val)}
                  min={3}
                  max={12}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  Additional holding cost: {Math.round((metrics?.holding?.total || 0) * ((holdTime - (deal.holdingMonths || 6)) / (deal.holdingMonths || 6))).toLocaleString()}
                </p>
              </div>

              {/* ARV Shift Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-foreground">ARV Shift %</label>
                  <span className={`text-lg font-bold ${arvShift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {arvShift >= 0 ? '+' : ''}{arvShift}%
                  </span>
                </div>
                <Slider
                  value={[arvShift]}
                  onValueChange={([val]) => setArvShift(val)}
                  min={-20}
                  max={10}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  ARV impact: {arvShift >= 0 ? '+' : ''}{Math.round((metrics?.arv || 0) * (arvShift / 100)).toLocaleString()}
                </p>
              </div>

              <p className="text-xs text-muted-foreground mt-2 italic">
                Sliders above affect scenario profit only — not Minimum ARV
              </p>

              {/* Most Likely Outcome */}
              <div className="bg-muted p-4 rounded-lg border border-border mt-4">
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Most Likely Outcome
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Expected Net Profit</span>
                    <span className={`text-sm font-bold ${expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.round(expectedProfit).toLocaleString()}
                    </span>
                  </div>
                  {Math.abs(adjustedProfit - expectedProfit) > 1 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Adjusted Profit (toggled risks)</span>
                        <span className={`text-sm font-bold ${adjustedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.round(adjustedProfit).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-xs text-muted-foreground">Difference</span>
                        <span className={`text-xs font-bold ${(adjustedProfit - expectedProfit) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(adjustedProfit - expectedProfit) >= 0 ? '+' : ''}${Math.round(adjustedProfit - expectedProfit).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Probability of Loss</span>
                    <span className="text-sm font-bold text-red-600">{lossProb.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Break-Even Confidence</span>
                    <span className="text-sm font-bold text-green-600">{breakEvenDisplay}%</span>
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
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <TrendingUp className="text-primary" />
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
                      stroke="#3FB4E0" 
                      fill="#3FB4E0" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Based on {scenarios.length} scenarios with probability-weighted outcomes
              </div>
            </CardContent>
          </Card>

          {/* Top 3 Threats */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
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
                      <span className="text-sm font-bold text-foreground">
                        {idx + 1}. {threat.name}
                      </span>
                      <span className="text-xs font-bold text-red-600">
                        {threat.probability.toFixed(0)}% prob
                      </span>
                    </div>
                    <p className="text-xs text-foreground">
                      → {threat.impact}
                    </p>
                    {(threat.profitImpact != null || threat.costImpact != null) && (
                      <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                        {threat.profitImpact != null && threat.profitImpact !== 0 && (
                          <p className="text-xs text-red-600">
                            Profit impact: {threat.profitImpact >= 0 ? '+' : ''}${Math.round(threat.profitImpact).toLocaleString()}
                          </p>
                        )}
                        {threat.costImpact != null && threat.costImpact > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Cost impact: +${Math.round(threat.costImpact).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {topThreats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
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
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Zap className="text-yellow-600" />
              Market Shock Scenarios
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Toggle to apply to profit calculation</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketShocks && Object.entries(marketShocks).filter(([key]) => key !== 'aiInsight').map(([key, shock]) => {
              const prob = (shock.probability || 0) / 100;
              const profitImpact = shock.impactROI != null ? expectedProfit * (-(shock.impactROI) / 100) * prob : 0;
              const holdingCostImpact = (shock.impactHoldingCost != null && (metrics?.holding?.total || 0) > 0)
                ? (metrics.holding.total || 0) * ((shock.impactHoldingCost || 0) / 100) * prob : 0;
              const salePriceImpact = (shock.impactSalePrice != null && (metrics?.arv ?? 0) > 0)
                ? (metrics.arv || 0) * (Math.min(0, shock.impactSalePrice) / 100) * prob : 0;
              const costImpact = holdingCostImpact + (shock.impactCost != null ? (shock.impactCost || 0) * prob : 0) + (salePriceImpact < 0 ? -salePriceImpact : 0);
              return (
              <div key={key} className="bg-muted p-3 rounded-lg border border-border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={marketShockEnabled[key] || false}
                      onChange={(e) => setMarketShockEnabled(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-bold text-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-yellow-600">
                    {shock.probability}% prob
                  </span>
                </div>
                {shock.impactHoldingCost && (
                  <p className="text-xs text-muted-foreground">Holding cost: +{shock.impactHoldingCost}%</p>
                )}
                {shock.impactROI && (
                  <p className="text-xs text-muted-foreground">ROI impact: {shock.impactROI > 0 ? '+' : ''}{shock.impactROI}%</p>
                )}
                {shock.impactDOM && (
                  <p className="text-xs text-muted-foreground">DOM: +{shock.impactDOM} days</p>
                )}
                {shock.impactSalePrice && (
                  <p className="text-xs text-muted-foreground">Sale price: {shock.impactSalePrice}%</p>
                )}
                {(profitImpact !== 0 || costImpact > 0) && (
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                    {profitImpact !== 0 && (
                      <p className="text-xs text-red-600">
                        Profit impact: {profitImpact >= 0 ? '+' : ''}${Math.round(profitImpact).toLocaleString()}
                      </p>
                    )}
                    {costImpact > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cost impact: +${Math.round(costImpact).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {marketShockEnabled[key] && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Applied to profit calculation</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Source: {shock.dataSource}</p>
              </div>
            ); })}
          </CardContent>
        </Card>

        {/* Hidden Cost Radar - Adjustable */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <DollarSign className="text-primary" />
              Hidden Cost Radar
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Toggle to apply to profit calculation</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {hiddenCosts.map((cost, idx) => {
              const expectedProfitImpact = (cost.impact || 0) * ((cost.probability || 0) / 100);
              return (
              <div key={idx} className="bg-muted p-3 rounded-lg border border-border">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hiddenCostEnabled[cost.name] || false}
                      onChange={(e) => setHiddenCostEnabled(prev => ({ ...prev, [cost.name]: e.target.checked }))}
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">{cost.name}</span>
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {cost.probability.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Impact: +${cost.impact.toLocaleString()}
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-0.5">
                  <p className="text-xs text-red-600">
                    Profit impact: -${Math.round(expectedProfitImpact).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cost impact: +${cost.impact.toLocaleString()}
                  </p>
                </div>
                {cost.probability > cost.baseProb && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ↑ Elevated risk (base: {cost.baseProb}%)
                  </p>
                )}
                {hiddenCostEnabled[cost.name] && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Applied to profit calculation</p>
                )}
              </div>
            ); })}
          </CardContent>
        </Card>

        {/* Timeline Collision Analyzer - Adjustable */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Clock className="text-accentBrand" />
              Timeline Collision Risk
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Toggle individual risks to apply to profit</p>
          </CardHeader>
          <CardContent>
            {timelineCollision ? (
              <div className="space-y-3">
                <div className="bg-muted p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">30+ Day Delay Probability</p>
                  <p className="text-lg font-bold text-accentBrand">
                    {timelineCollision.probability30Plus.toFixed(1)}%
                  </p>
                </div>
                {timelineRisks && Object.entries(timelineRisks).map(([key, risk]) => {
                  const prob = (risk.probability || 0) / 100;
                  const profitImpact = -(risk.cost || 0) * prob;
                  return (
                  <div key={key} className="bg-muted p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={timelineRiskEnabled[key] || false}
                        onChange={(e) => setTimelineRiskEnabled(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-border bg-background text-accentBrand focus:ring-ring"
                      />
                      <span className="text-sm font-medium text-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-xs font-bold text-accentBrand ml-auto">
                        {risk.probability}% prob
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{risk.days} days, +${Math.round(risk.cost).toLocaleString()}
                    </p>
                    <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-0.5">
                      <p className="text-xs text-red-600">
                        Profit impact: {profitImpact >= 0 ? '+' : ''}${Math.round(profitImpact).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cost impact: +${Math.round(risk.cost || 0).toLocaleString()}
                      </p>
                    </div>
                    {timelineRiskEnabled[key] && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Applied to profit calculation</p>
                    )}
                  </div>
                ); })}
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total ROI Impact</p>
                  <p className="text-sm font-bold text-red-400">
                    -{timelineCollision.roiImpact.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timelineCollision.probability30Plus > 40 
                      ? "⚠️ High risk of significant delays"
                      : "✅ Manageable delay risk"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
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
