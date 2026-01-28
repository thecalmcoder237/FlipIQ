
export const calculateGrossProfit = (arv, purchasePrice) => {
  if (!arv || !purchasePrice) return 0;
  return parseFloat(arv) - parseFloat(purchasePrice);
};

export const aggregateCostsByCategory = (deal) => {
  if (!deal) return {};
  
  const purchasePrice = parseFloat(deal.purchase_price) || 0;
  const rehabCosts = parseFloat(deal.rehab_costs) || 0;
  
  // Holding Costs
  const holdingMonths = parseInt(deal.holding_months) || 6;
  const monthlyHolding = (
    (parseFloat(deal.utilities) || 0) +
    (parseFloat(deal.insurance) || 0) +
    (parseFloat(deal.property_tax) || 0) / 12 +
    (parseFloat(deal.lawn_maintenance) || 0) +
    (parseFloat(deal.hoa) || 0)
  );
  const totalHolding = monthlyHolding * holdingMonths;

  // Financing Costs
  const hardMoneyRate = parseFloat(deal.hard_money_rate) || 0;
  const hardMoneyPoints = parseFloat(deal.hard_money_points) || 0;
  const downPaymentPercent = parseFloat(deal.down_payment_percent) || 0;
  const loanAmount = purchasePrice * (1 - (downPaymentPercent / 100));
  const pointsCost = loanAmount * (hardMoneyPoints / 100);
  const interestCost = loanAmount * (hardMoneyRate / 100 / 12) * holdingMonths;
  const totalFinancing = pointsCost + interestCost;

  // Selling Costs
  const arv = parseFloat(deal.arv) || 0;
  const realtorCommission = arv * ((parseFloat(deal.realtor_commission) || 6) / 100);
  const closingCosts = parseFloat(deal.closing_costs) || (purchasePrice * 0.03); // Estimate if null
  const stagingCosts = parseFloat(deal.staging_costs) || 0;
  const totalSelling = realtorCommission + closingCosts + stagingCosts;

  // Acquisition/Other
  const inspectionCosts = parseFloat(deal.inspection_costs) || 0;
  const appraisalCosts = parseFloat(deal.appraisal_costs) || 0;
  const titleCosts = parseFloat(deal.title_costs) || 0;
  const totalOther = inspectionCosts + appraisalCosts + titleCosts;

  const totalCosts = purchasePrice + rehabCosts + totalHolding + totalFinancing + totalSelling + totalOther;

  return {
    purchasePrice,
    rehabCosts,
    totalHolding,
    totalFinancing,
    totalSelling,
    totalOther,
    totalCosts
  };
};

export const calculateNetProfit = (arv, allCosts) => {
  if (!arv || !allCosts) return 0;
  return parseFloat(arv) - allCosts.totalCosts;
};

export const calculateProfitMargin = (netProfit, arv) => {
  if (!arv || arv === 0) return 0;
  return (netProfit / parseFloat(arv)) * 100;
};

export const calculateROI = (netProfit, totalInvestment) => {
  if (!totalInvestment || totalInvestment === 0) return 0;
  return (netProfit / totalInvestment) * 100;
};

export const calculateCashOnCashReturn = (annualCashFlow, cashInvested) => {
  if (!cashInvested || cashInvested === 0) return 0;
  return (annualCashFlow / cashInvested) * 100;
};

export const calculateTotalHoldingCosts = (monthlyHoldingCost, holdingMonths) => {
  return (monthlyHoldingCost || 0) * (holdingMonths || 0);
};

export const calculateTotalSellingCosts = (arv, realtorCommissionPercent, closingCostsPercent) => {
  if (!arv) return 0;
  const commission = arv * ((realtorCommissionPercent || 6) / 100);
  const closing = arv * ((closingCostsPercent || 3) / 100);
  return commission + closing;
};

export const calculateInvestmentGrade = (roi, cashFlow, riskLevel) => {
  // Simple heuristic
  let score = 0;
  if (roi > 20) score += 3;
  else if (roi > 10) score += 2;
  else if (roi > 0) score += 1;

  // Cash flow only relevant for rentals, but we can use it if present
  if (cashFlow > 500) score += 2;
  else if (cashFlow > 200) score += 1;

  // Risk (assume 1-10, lower is better)
  if (riskLevel <= 3) score += 3;
  else if (riskLevel <= 6) score += 2;
  else score += 1;

  if (score >= 7) return 'A';
  if (score >= 5) return 'B';
  if (score >= 3) return 'C';
  return 'D';
};
