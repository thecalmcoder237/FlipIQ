/**
 * Risk calculation utilities for Scenario Risk Model
 */

/**
 * Calculate probability-weighted expected value
 */
export function calculateExpectedValue(scenarios) {
  if (!scenarios || scenarios.length === 0) return 0;
  
  return scenarios.reduce((sum, scenario) => {
    return sum + (scenario.profit * (scenario.probability / 100));
  }, 0);
}

/**
 * Calculate probability of loss
 */
export function calculateLossProbability(scenarios) {
  if (!scenarios || scenarios.length === 0) return 0;
  
  const lossScenarios = scenarios.filter(s => s.profit < 0);
  return lossScenarios.reduce((sum, s) => sum + (s.probability / 100), 0) * 100;
}

/**
 * Calculate break-even confidence
 */
export function calculateBreakEvenConfidence(scenarios) {
  if (!scenarios || scenarios.length === 0) return 0;
  
  const profitableScenarios = scenarios.filter(s => s.profit >= 0);
  return profitableScenarios.reduce((sum, s) => sum + (s.probability / 100), 0) * 100;
}

/**
 * Generate probability curve data
 */
export function generateProbabilityCurve(scenarios, minProfit = -50000, maxProfit = 200000, steps = 50) {
  const stepSize = (maxProfit - minProfit) / steps;
  const curve = [];
  
  for (let i = 0; i <= steps; i++) {
    const profitThreshold = minProfit + (stepSize * i);
    const probability = scenarios.reduce((sum, scenario) => {
      if (scenario.profit >= profitThreshold) {
        return sum + (scenario.probability / 100);
      }
      return sum;
    }, 0) * 100;
    
    curve.push({
      profit: Math.round(profitThreshold),
      probability: Math.round(probability * 10) / 10
    });
  }
  
  return curve;
}

/**
 * Calculate risk score (0-100, where 0 = safe, 100 = high risk)
 */
export function calculateRiskScore(deal, metrics, scenarios) {
  let riskScore = 0;
  
  // Base risk from loss probability
  const lossProb = calculateLossProbability(scenarios);
  riskScore += lossProb * 0.4; // 40% weight
  
  // ROI risk
  if (metrics.roi < 10) riskScore += 20;
  else if (metrics.roi < 15) riskScore += 10;
  
  // Rehab overrun risk
  const rehabOverrun = deal.rehabOverrunPercent || 0;
  if (rehabOverrun > 30) riskScore += 15;
  else if (rehabOverrun > 20) riskScore += 8;
  
  // Holding period risk
  const holdingMonths = deal.holdingMonths || 6;
  if (holdingMonths > 8) riskScore += 15;
  else if (holdingMonths > 6) riskScore += 8;
  
  // ARV shift risk
  const arvShift = deal.arvShift || 0;
  if (arvShift < -10) riskScore += 10;
  
  return Math.min(100, Math.max(0, riskScore));
}

/**
 * Identify top threats
 */
export function identifyTopThreats(deal, metrics, scenarios, hiddenCosts, timelineRisks) {
  const threats = [];
  
  // Rehab overrun threat
  if (deal.rehabOverrunPercent > 20) {
    const overrunCost = (metrics.rehab?.total || 0) * (deal.rehabOverrunPercent / 100);
    threats.push({
      name: 'Rehab Overrun',
      probability: Math.min(100, deal.rehabOverrunPercent * 2),
      impact: `+$${Math.round(overrunCost).toLocaleString()} cost`,
      severity: overrunCost > 10000 ? 'high' : 'medium'
    });
  }
  
  // Permit delay threat
  if (timelineRisks?.permitDelay) {
    threats.push({
      name: 'Permit Delay',
      probability: timelineRisks.permitDelay.probability,
      impact: `+${timelineRisks.permitDelay.days} days, +$${Math.round(timelineRisks.permitDelay.cost).toLocaleString()}`,
      severity: timelineRisks.permitDelay.days > 20 ? 'high' : 'medium'
    });
  }
  
  // ARV drop threat
  if (deal.arvShift < -5) {
    const arvLoss = (metrics.arv || 0) * (Math.abs(deal.arvShift) / 100);
    threats.push({
      name: 'ARV Decline',
      probability: Math.abs(deal.arvShift) * 5,
      impact: `-$${Math.round(arvLoss).toLocaleString()} sale price`,
      severity: arvLoss > 15000 ? 'high' : 'medium'
    });
  }
  
  // Hidden cost threats
  hiddenCosts?.forEach(cost => {
    if (cost.probability > 15) {
      threats.push({
        name: cost.name,
        probability: cost.probability,
        impact: `+$${Math.round(cost.impact).toLocaleString()}`,
        severity: cost.impact > 10000 ? 'high' : 'medium'
      });
    }
  });
  
  // Sort by probability * impact
  threats.sort((a, b) => {
    const aScore = a.probability * (parseFloat(a.impact.replace(/[^0-9]/g, '')) || 0);
    const bScore = b.probability * (parseFloat(b.impact.replace(/[^0-9]/g, '')) || 0);
    return bScore - aScore;
  });
  
  return threats.slice(0, 3);
}

/**
 * Calculate minimum ARV needed for profitability
 */
export function calculateMinARV(deal, metrics, targetProfit = 0) {
  const purchasePrice = Number(deal.purchasePrice || deal.purchase_price) || 0;
  const rehabCosts = Number(metrics.rehab?.total || deal.rehabCosts || 0);
  const rehabOverrun = (deal.rehabOverrunPercent || 0) / 100;
  const holdingMonths = Number(deal.holdingMonths || 6);
  const holdingCosts = Number(metrics.holding?.total || 0);
  const sellingCosts = Number(metrics.selling?.total || 0);
  const acquisitionCosts = Number(metrics.acquisition?.feesOnly || 0);
  const hardMoneyCosts = Number(metrics.hardMoney?.total || 0);
  
  // Calculate total costs with overrun
  const totalRehab = rehabCosts * (1 + rehabOverrun);
  
  // Estimate holding costs for extended period
  const monthlyHolding = holdingCosts / (deal.holdingMonths || 6);
  const extendedHolding = monthlyHolding * holdingMonths;
  
  // Minimum ARV = All costs + target profit
  const minARV = purchasePrice + 
                 acquisitionCosts + 
                 hardMoneyCosts + 
                 totalRehab + 
                 extendedHolding + 
                 sellingCosts + 
                 targetProfit;
  
  return Math.round(minARV);
}

/**
 * Calculate timeline collision risk
 */
export function calculateTimelineCollision(timelineRisks) {
  if (!timelineRisks) return null;
  
  const risks = [
    { name: 'Permit Delay', prob: timelineRisks.permitDelay?.probability || 0, days: timelineRisks.permitDelay?.days || 0 },
    { name: 'Contractor Delay', prob: timelineRisks.contractorDelay?.probability || 0, days: timelineRisks.contractorDelay?.days || 0 },
    { name: 'Inspection Delay', prob: timelineRisks.inspectionDelay?.probability || 0, days: timelineRisks.inspectionDelay?.days || 0 }
  ];
  
  // Calculate combined probability of 30+ day delay
  // Using probability of at least one major delay
  const prob30Plus = risks.reduce((acc, risk) => {
    if (risk.days >= 20) {
      return acc + (risk.prob / 100);
    }
    return acc;
  }, 0);
  
  const totalDays = risks.reduce((sum, r) => sum + r.days, 0);
  const totalCost = risks.reduce((sum, r) => sum + (r.days * 50), 0); // ~$50/day holding cost
  
  return {
    probability30Plus: Math.min(100, prob30Plus * 100),
    totalDays: totalDays,
    totalCost: totalCost,
    roiImpact: totalCost > 0 ? ((totalCost / 100000) * 15) : 0 // Rough ROI impact %
  };
}

/**
 * Calculate hidden costs with Bayesian updates
 */
export function calculateHiddenCosts(deal, propertyIntelligence) {
  const costs = [];
  
  // Base probabilities (national averages)
  const baseProbs = {
    structuralDamage: 22,
    titleDefect: 3.1,
    hoaFees: 17,
    permitRework: 29
  };
  
  // Bayesian updates based on property characteristics
  const yearBuilt = propertyIntelligence?.yearBuilt || deal.yearBuilt || 2000;
  const propertyType = propertyIntelligence?.propertyType || deal.propertyType || 'Single-Family';
  const roofAge = propertyIntelligence?.roofAge || 'Unknown';
  
  // Structural damage - higher if older
  let structProb = baseProbs.structuralDamage;
  if (yearBuilt < 1980) structProb *= 1.5;
  if (yearBuilt < 1970) structProb *= 1.3;
  
  costs.push({
    name: 'Undisclosed Structural Damage',
    probability: Math.min(100, structProb),
    impact: yearBuilt < 1980 ? 25000 : 8000,
    baseProb: baseProbs.structuralDamage
  });
  
  // Title defect
  costs.push({
    name: 'Title Defect / Lien',
    probability: baseProbs.titleDefect,
    impact: 5000,
    baseProb: baseProbs.titleDefect
  });
  
  // HOA fees (if applicable)
  if (propertyType.includes('Condo') || propertyType.includes('Townhouse')) {
    costs.push({
      name: 'HOA Surprise Fees',
      probability: baseProbs.hoaFees,
      impact: 1200,
      baseProb: baseProbs.hoaFees
    });
  }
  
  // Permit rework - higher if older build
  let permitProb = baseProbs.permitRework;
  if (yearBuilt < 1980) permitProb *= 1.2;
  
  costs.push({
    name: 'Permit Rework Required',
    probability: Math.min(100, permitProb),
    impact: 3500,
    baseProb: baseProbs.permitRework
  });
  
  return costs;
}
