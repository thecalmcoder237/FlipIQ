
import { 
    calculateAcquisitionCosts, 
    calculateHardMoneyCosts, 
    calculateRehabCosts, 
    calculateHoldingCosts, 
    calculateSellingCosts,
    calculateDealQualityScore,
    simulateWorstCase
} from './advancedDealCalculations';
import { logDataFlow } from './dataFlowDebug';

/**
 * Calculates all financial metrics for a deal based on inputs.
 * Ensures robust type conversion and validation.
 */
export const calculateDealMetrics = (deal) => {
  console.group('💰 calculateDealMetrics Start');
  logDataFlow('INPUTS_TO_CALCULATE', deal, new Date());

  if (!deal) {
    console.warn("calculateDealMetrics received null/undefined deal input");
    console.groupEnd();
    return null;
  }

  // 1. Validate & Normalize Inputs
  const inputs = {
    purchasePrice: Number(deal.purchasePrice || deal.purchase_price) || 0,
    arv: Number(deal.arv) || 0,
    // Pass through other fields for advanced calculators
    ...deal 
  };
  
  if (inputs.purchasePrice <= 0) console.warn("⚠️ Warning: Purchase Price is 0 or invalid");
  if (inputs.arv <= 0) console.warn("⚠️ Warning: ARV is 0 or invalid");

  // 2. Calculate Categories
  const acq = calculateAcquisitionCosts(inputs);
  const hm = calculateHardMoneyCosts(inputs);
  const rehab = calculateRehabCosts(inputs);
  const holding = calculateHoldingCosts(inputs);
  const selling = calculateSellingCosts(inputs);

  // 3. Calculate Totals
  const totalCashInvested = acq.total + rehab.total;
  // Project Cost = Purchase + Fees + Interest + Rehab + Holding
  const totalProjectCost = inputs.purchasePrice + acq.feesOnly + hm.total + rehab.total + holding.total;
  
  const grossProfit = inputs.arv - totalProjectCost;
  const netProfit = grossProfit - selling.total;

  console.log('🧮 Profit Calc:', {
      arv: inputs.arv,
      totalProjectCost,
      sellingCosts: selling.total,
      grossProfit,
      netProfit
  });

  // 4. ROI & Margins
  const roi = totalCashInvested > 0 ? (netProfit / totalCashInvested) * 100 : 0;
  const profitMargin = inputs.arv > 0 ? (netProfit / inputs.arv) * 100 : 0;
  
  // Annualized ROI
  const months = Number(inputs.holdingMonths || inputs.holding_months) || 6;
  const annualizedRoi = (months > 0 && roi !== 0) 
      ? (Math.pow((1 + roi / 100), (12 / months)) - 1) * 100 
      : 0;

  // 5. Deal Score Calculation
  const estimatedRisk = 50; 
  const estimatedMarket = 70; 
  const proxyCashFlow = netProfit > 0 ? netProfit / 12 : 0;

  const dealScore = calculateDealQualityScore(
      roi, 
      proxyCashFlow, 
      deal.riskScore || estimatedRisk, 
      deal.marketScore || estimatedMarket
  );

  // 6. Percentages for Breakdown
  const totalAllCosts = totalProjectCost + selling.total;
  const costBreakdown = {
      purchasePercent: totalAllCosts > 0 ? (inputs.purchasePrice / totalAllCosts) * 100 : 0,
      rehabPercent: totalAllCosts > 0 ? (rehab.total / totalAllCosts) * 100 : 0,
      holdingPercent: totalAllCosts > 0 ? ((holding.total + hm.total) / totalAllCosts) * 100 : 0,
      sellingPercent: totalAllCosts > 0 ? (selling.total / totalAllCosts) * 100 : 0,
      acquisitionFeesPercent: totalAllCosts > 0 ? (acq.feesOnly / totalAllCosts) * 100 : 0
  };

  // 7. ALWAYS RUN SCENARIO CALCULATIONS
  // Calculate Worst Case by default for automatic display
  const baseMetricsForSim = { netProfit, totalProjectCost, roi, score: dealScore, risk: dealScore > 75 ? 'Low' : dealScore > 50 ? 'Medium' : 'High' };
  const worstCaseSim = simulateWorstCase(inputs, baseMetricsForSim);

  const results = {
    // Inputs passed through
    arv: inputs.arv,
    purchasePrice: inputs.purchasePrice,
    
    // Category Objects
    acquisition: acq,
    hardMoney: hm,
    rehab: rehab,
    holding: holding,
    selling: selling,

    // Totals
    totalCashInvested,
    totalProjectCost,
    grossProfit,
    netProfit,
    
    // Ratios & Score
    roi,
    annualizedRoi,
    profitMargin,
    score: dealScore, 
    percentages: costBreakdown,

    // Legacy/Component Compat
    rehabCosts: rehab.total,
    holdingCosts: holding.total,
    totalInterest: hm.total,
    closingCosts: acq.feesOnly,
    risk: dealScore > 75 ? 'Low' : dealScore > 50 ? 'Medium' : 'High',

    // SCENARIO DATA
    scenarios: {
        worstCase: worstCaseSim
    }
  };

  console.log('✅ Final Metrics with Score & Scenarios:', results);
  console.groupEnd();
  return results;
};
