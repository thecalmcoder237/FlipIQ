
export const calculateAcquisitionCosts = (deal) => {
  const purchasePrice = Number(deal.purchasePrice || deal.purchase_price) || 0;
  
  // Down Payment
  const downPaymentPercent = Number(deal.downPaymentPercent || deal.down_payment_percent) || 20;
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  
  // Loan params for points calculation
  const loanAmount = purchasePrice - downPayment;
  const pointsPercent = Number(deal.hardMoneyPoints || deal.hard_money_points) || 0;
  const hardMoneyPoints = loanAmount * (pointsPercent / 100);

  // Fees
  const inspection = Number(deal.inspectionCost || deal.inspection_costs) || 0;
  const appraisal = Number(deal.appraisalCost || deal.appraisal_costs) || 0;
  const titleInsurance = Number(deal.titleInsurance || deal.title_costs) || 0;
  const closingCostsBuying = Number(deal.closingCostsBuying || deal.closing_costs_buying || deal.closing_costs) || 0;
  
  // Transfer Tax
  const transferTaxRate = Number(deal.transferTaxRate || deal.transfer_tax_rate) || 0;
  const transferTax = purchasePrice * (transferTaxRate / 100);

  // Total Acquisition (As defined by user: Down Payment + Fees)
  const total = downPayment + hardMoneyPoints + inspection + appraisal + titleInsurance + closingCostsBuying + transferTax;
  
  // Fees Only (For Project Cost calculation to avoid double counting Purchase Price + Down Payment)
  const feesOnly = hardMoneyPoints + inspection + appraisal + titleInsurance + closingCostsBuying + transferTax;

  console.log('AdvancedCalc: Acquisition', { downPayment, feesOnly, total });

  return {
    downPayment,
    hardMoneyPoints,
    inspection,
    appraisal,
    titleInsurance,
    closingCostsBuying,
    transferTax,
    feesOnly, // Helper for other calcs
    total
  };
};

export const calculateHardMoneyCosts = (deal, adjustedMonths = null) => {
  const purchasePrice = Number(deal.purchasePrice || deal.purchase_price) || 0;
  const downPaymentPercent = Number(deal.downPaymentPercent || deal.down_payment_percent) || 20;
  const loanAmount = purchasePrice * (1 - (downPaymentPercent / 100));
  
  const rate = Number(deal.hardMoneyRate || deal.hard_money_rate) || 0;
  const months = adjustedMonths !== null ? Number(adjustedMonths) : (Number(deal.holdingMonths || deal.holding_months) || 0);

  // Monthly Interest = (Loan Amount * Rate / 100 / 12)
  const monthlyInterest = loanAmount * (rate / 100 / 12);
  const totalInterest = monthlyInterest * months;

  console.log('AdvancedCalc: HardMoney', { loanAmount, monthlyInterest, totalInterest, months });

  return {
    loanAmount,
    monthlyInterest,
    totalInterest,
    actualHoldingMonths: months,
    total: totalInterest
  };
};

export const calculateRehabCosts = (deal, overrunPercent = 0) => {
  const baseRehab = Number(deal.rehabCosts || deal.rehab_costs) || 0;
  
  // Overrun
  const dealOverrunPercent = Number(deal.rehabOverrunPercent || deal.rehab_overrun_percent) || 0;
  const activeOverrunPercent = overrunPercent !== 0 ? overrunPercent : dealOverrunPercent;
  const overrun = baseRehab * (activeOverrunPercent / 100);
  
  // Contingency
  const contingencyPercent = Number(deal.contingencyPercent || deal.contingency_percent) || 0;
  const contingency = baseRehab * (contingencyPercent / 100);
  
  const permitFees = Number(deal.permitFees || deal.permit_fees) || 0;

  const total = baseRehab + overrun + contingency + permitFees;

  console.log('AdvancedCalc: Rehab', { baseRehab, overrun, contingency, permitFees, total });

  return {
    baseRehab,
    overrun,
    contingency,
    permitFees,
    total
  };
};

export const calculateHoldingCosts = (deal, adjustedMonths = null) => {
    const months = adjustedMonths !== null ? Number(adjustedMonths) : (Number(deal.holdingMonths || deal.holding_months) || 0);
    
    // Monthly Costs
    const monthlyTax = Number(deal.propertyTax || deal.property_tax) || 0; 
    const monthlyIns = Number(deal.insurance) || 0;
    const monthlyUtil = Number(deal.utilities) || 0;
    const monthlyHoa = Number(deal.hoa) || 0;
    const monthlyLawn = Number(deal.lawnMaintenance || deal.lawn_maintenance) || 0;
    
    const totalMonthlySoft = monthlyTax + monthlyIns + monthlyUtil + monthlyHoa + monthlyLawn;
    const totalSoft = totalMonthlySoft * months;

    console.log('AdvancedCalc: Holding', { totalMonthlySoft, totalSoft, months });

    return {
        monthlyTax,
        monthlyIns,
        monthlyUtil,
        monthlyHoa,
        monthlyLawn,
        totalMonthlySoft,
        totalSoft,
        total: totalSoft 
    };
};

export const calculateSellingCosts = (deal, arvAdjustment = 0) => {
  const originalArv = Number(deal.arv) || 0;
  const arv = originalArv * (1 + (arvAdjustment / 100));
  
  const commissionPercent = Number(deal.realtorCommission || deal.realtor_commission) || 0;
  const closingPercent = Number(deal.closingCostsSelling || deal.closing_costs_selling) || 0;

  const realtorCommission = arv * (commissionPercent / 100);
  const closingCostsSelling = arv * (closingPercent / 100);
  
  const staging = Number(deal.stagingCost || deal.staging_costs || deal.staging_cost) || 0;
  const marketing = Number(deal.marketingCost || deal.marketing_costs || deal.marketing_cost) || 0;
  
  // Buyer Financing Fallthrough Risk (treated as cost reserve)
  const fallthroughPercent = Number(deal.buyerFinancingFallthrough || deal.buyer_financing_fallthrough) || 0;
  const fallthroughCost = arv * (fallthroughPercent / 100);

  const total = realtorCommission + closingCostsSelling + staging + marketing + fallthroughCost;

  console.log('AdvancedCalc: Selling', { arv, realtorCommission, total });

  return {
    realtorCommission,
    closingCostsSelling,
    staging,
    marketing,
    fallthroughCost,
    total
  };
};

// --- New Functions ---

export const calculateBRRRRProjection = (purchasePrice, arv, rehabCosts, refiPercent) => {
  const refiAmount = arv * (refiPercent / 100);
  // Estimate total invested roughly as Purchase + Rehab + approx closing (3%)
  const estimatedClosing = purchasePrice * 0.03; 
  const totalInvested = purchasePrice + rehabCosts + estimatedClosing;
  
  const capitalRecovered = refiAmount - totalInvested;
  
  // Estimate Rent (0.8% rule)
  const estimatedRent = arv * 0.008;
  
  // Estimate Refi Mortgage (7% interest, 30yr amortization)
  const r = 0.07 / 12;
  const n = 30 * 12;
  const monthlyPI = refiAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  
  // Estimate Expenses (40% of rent)
  const expenses = estimatedRent * 0.40;
  
  const monthlyCashFlow = estimatedRent - monthlyPI - expenses;
  
  return {
    refiAmount,
    monthlyCashFlow,
    capitalRecovered,
    isPerfectBRRRR: capitalRecovered >= 0
  };
};

export const calculateDealQualityScore = (roi, monthlyCashFlow, riskScore, marketScore) => {
    // Requirements: (roi * 0.3) + (monthlyCashFlow * 0.2) + ((100 - riskScore) * 0.3) + (marketScore * 0.2)
    // We normalize inputs to 0-100 scale first to make the weighting logic meaningful
    
    // ROI: 20% or more is considered 100 (excellent)
    const normalizedRoi = Math.min((roi / 20) * 100, 100); 
    const finalRoi = Math.max(normalizedRoi, 0); // clamp negative ROI to 0 for score
    
    // Cash Flow: $500/mo or more is considered 100
    const normalizedCF = Math.min((monthlyCashFlow / 500) * 100, 100);
    const finalCF = Math.max(normalizedCF, 0);

    // Risk Score: Input 0-100. (Lower is better).
    // Formula asks for (100 - riskScore), so if risk is 100 (high), component is 0. If risk is 0, component is 100.
    // This assumes riskScore passed in is 0-100 where 100 is MAX RISK.
    const riskComponent = Math.max(0, 100 - riskScore);

    // Market Score: Input 0-100. (Higher is better)
    const marketComponent = Math.min(Math.max(marketScore, 0), 100);

    // Apply weights
    // Weights: 0.3 + 0.2 + 0.3 + 0.2 = 1.0
    const score = (finalRoi * 0.3) + (finalCF * 0.2) + (riskComponent * 0.3) + (marketComponent * 0.2);
    
    console.log('📊 Deal Score Calc:', { 
        roi, normalizedRoi: finalRoi, 
        monthlyCashFlow, normalizedCF: finalCF, 
        riskScore, riskComponent,
        marketScore, marketComponent,
        finalScore: Math.round(score) 
    });

    return Math.round(score);
};

export const compareExitStrategies = (deal, metrics) => {
    const arv = Number(deal.arv) || 0;
    const rehab = Number(deal.rehabCosts || deal.rehab_costs) || 0;
    const purchase = Number(deal.purchasePrice || deal.purchase_price) || 0;

    // Flip
    const flipProfit = metrics.netProfit;
    
    // Wholesale
    // Rule of thumb: 70% of ARV - Rehab - Fee(10k) = Max Allowable Offer.
    // If we have it under contract at 'purchase', our profit is (MAO - purchase).
    const wholesaleFee = 10000; // Assumed assignment fee potential
    // Actually, wholesale profit is usually just the fee if the numbers work.
    // But let's calculate the spread.
    const wholesaleSpread = ((arv * 0.7) - rehab) - purchase;
    const wholesaleProfit = Math.max(wholesaleSpread, 0); // Can't be negative profit really, just no deal.

    // BRRRR
    const brrrr = calculateBRRRRProjection(purchase, arv, rehab, 75);
    const annualCashFlow = brrrr.monthlyCashFlow * 12;

    return {
        flip: {
            profit: flipProfit,
            pros: ["Large lump sum", "Clean exit", "No tenant headaches"]
        },
        wholesale: {
            profit: wholesaleProfit,
            pros: ["Quick cash", "No rehab risk", "Minimal capital required"]
        },
        brrrr: {
            profit: annualCashFlow,
            pros: ["Wealth building", "Tax benefits", "Passive income"]
        }
    };
};

export const applyScenarioAdjustments = (deal, adjustments) => {
  const { 
    rehabOverrunPercent = 0, 
    holdingPeriodAdjustment = 0, 
    marketAppreciationPercent = 0, 
    permitDelayDays = 0 
  } = adjustments || {};

  // 1. ARV
  const baseArv = Number(deal.arv) || 0;
  const arv = baseArv * (1 + (marketAppreciationPercent / 100));

  // 2. Rehab
  const rehabCalc = calculateRehabCosts(deal, rehabOverrunPercent);
  const rehabCosts = rehabCalc.total;

  // 3. Timeline
  const baseMonths = Number(deal.holdingMonths || deal.holding_months) || 6;
  const permitDelayMonths = permitDelayDays / 30;
  const totalMonths = baseMonths + holdingPeriodAdjustment + permitDelayMonths;

  // 4. Holding Costs
  const holdingCalc = calculateHoldingCosts(deal, totalMonths);
  const holdingCosts = holdingCalc.total;
  
  // 5. Hard Money
  const hardMoneyCalc = calculateHardMoneyCosts(deal, totalMonths);
  const hardMoneyCosts = hardMoneyCalc.total;

  // 6. Acquisition
  const acqCalc = calculateAcquisitionCosts(deal);
  const acquisitionCosts = acqCalc.total;
  const buyingCosts = acqCalc.feesOnly;

  // 7. Selling Costs (based on scenario ARV; not included in totalProjectCost to match base metrics)
  const sellingCalc = calculateSellingCosts(deal, marketAppreciationPercent);
  const sellingCosts = sellingCalc.total;

  // 8. Total Project Cost — match dealCalculations: purchase + fees + interest + rehab + holding (exclude selling)
  const purchasePrice = Number(deal.purchasePrice || deal.purchase_price) || 0;
  const totalProjectCost = purchasePrice + buyingCosts + rehabCosts + holdingCosts + hardMoneyCosts;

  // 9. Profit — match base: netProfit = (arv - totalProjectCost) - sellingCosts
  const netProfit = arv - totalProjectCost - sellingCosts;

  // 10. ROI — match base: netProfit / totalCashInvested (acq.total + rehab), not totalProjectCost
  const totalCashInvested = acquisitionCosts + rehabCosts;
  const roi = totalCashInvested > 0 ? (netProfit / totalCashInvested) * 100 : 0;

  // 11. Deal score and risk — so scenario comparison shows accurate score change
  const proxyCashFlow = netProfit > 0 ? netProfit / 12 : 0;
  const riskScore = deal.riskScore ?? 50;
  const marketScore = deal.marketScore ?? 70;
  const score = calculateDealQualityScore(roi, proxyCashFlow, riskScore, marketScore);
  const risk = roi < 10 ? 'High' : roi < 15 ? 'Medium' : 'Low';

  return {
    arv,
    rehabCosts,
    holdingCosts,
    sellingCosts,
    totalProjectCost,
    netProfit,
    roi,
    holdingMonths: totalMonths,
    score,
    risk
  };
};

export const simulateRiskScenarios = (deal, metrics, permitDelay, marketDecline, rehabOverrun) => {
    const adjustments = {
        rehabOverrunPercent: rehabOverrun,
        holdingPeriodAdjustment: 0,
        marketAppreciationPercent: -marketDecline,
        permitDelayDays: permitDelay * 30
    };

    const result = applyScenarioAdjustments(deal, adjustments);
    
    return {
        profit: result.netProfit,
        impact: (metrics.netProfit || 0) - result.netProfit
    };
};

export const calculate70RuleMAO = (arv, rehabCosts, conservative = false) => {
    const factor = conservative ? 0.65 : 0.70;
    return (arv * factor) - rehabCosts;
};

export const calculateTimelineProjections = (deal, metrics) => {
    const projections = [];
    const baseMonths = Number(deal.holdingMonths || deal.holding_months) || 6;
    
    for (let m = 1; m <= 12; m++) {
        const adjustments = {
            rehabOverrunPercent: 0,
            holdingPeriodAdjustment: m - baseMonths,
            marketAppreciationPercent: 0,
            permitDelayDays: 0
        };
        const res = applyScenarioAdjustments(deal, adjustments);
        projections.push({ month: m, profit: res.netProfit });
    }
    return projections;
};

export const simulateWorstCase = (deal, metrics) => {
    // 1. Market Crash (-20%)
    const crash = applyScenarioAdjustments(deal, { marketAppreciationPercent: -20 });
    
    // 2. Major Repair (+$20k approx)
    const baseRehab = Number(deal.rehabCosts || deal.rehab_costs) || 1;
    const repairPercent = (20000 / baseRehab) * 100;
    const repair = applyScenarioAdjustments(deal, { rehabOverrunPercent: repairPercent });
    
    // 3. 6 Month Delay
    const delay = applyScenarioAdjustments(deal, { holdingPeriodAdjustment: 6 });
    
    // 4. Financing Fallthrough (Simulate 4mo delay)
    const fallthrough = applyScenarioAdjustments(deal, { holdingPeriodAdjustment: 4 });

    return {
        marketCrash: crash.netProfit,
        majorRepair: repair.netProfit,
        extendedTimeline: delay.netProfit,
        financingFallthrough: fallthrough.netProfit
    };
};
