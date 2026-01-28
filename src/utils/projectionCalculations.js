
import { aggregateCostsByCategory, calculateNetProfit, calculateROI, calculateProfitMargin } from './financialCalculations';

// --- Core Calculation Wrappers ---

export const calculateCostBreakdown = (deal, hiddenCosts = []) => {
  // Safety check for deal
  if (!deal) {
    return {
      acquisition: { total: 0, items: [] },
      rehab: { total: 0, items: [] },
      holding: { total: 0, items: [] },
      selling: { total: 0, items: [] },
      revenue: { arv: 0, estimatedSalePrice: 0 },
      summary: { totalCosts: 0, revenue: 0, netProfit: 0, margin: 0 }
    };
  }

  let baseCosts;
  try {
    baseCosts = aggregateCostsByCategory(deal);
  } catch (e) {
    console.error("Error aggregating costs:", e);
    baseCosts = { totalHolding: 0, totalFinancing: 0, totalSelling: 0 };
  }
  
  // Initialize breakdown structure
  const breakdown = {
    acquisition: {
      total: 0,
      items: [
        { name: 'Purchase Price', amount: parseFloat(deal.purchase_price) || 0 },
        { name: 'Inspection', amount: parseFloat(deal.inspection_costs) || 0 },
        { name: 'Appraisal', amount: parseFloat(deal.appraisal_costs) || 0 },
        { name: 'Title/Legal', amount: parseFloat(deal.title_costs) || 0 },
        { name: 'Closing Costs (Buy)', amount: (parseFloat(deal.purchase_price) || 0) * 0.03 } // Estimate if not set
      ]
    },
    rehab: {
      total: 0,
      items: [
        { name: 'Base Rehab Budget', amount: parseFloat(deal.rehab_costs) || 0 },
        { name: 'Contingency', amount: (parseFloat(deal.rehab_costs) || 0) * (parseFloat(deal.contingency_percent || 10) / 100) }
      ]
    },
    holding: {
      total: (baseCosts.totalHolding || 0) + (baseCosts.totalFinancing || 0),
      items: [
        { name: 'Utilities & Services', amount: ((baseCosts.totalHolding || 0) - (baseCosts.totalFinancing || 0)) || 0 }, // Simplified
        { name: 'Financing Costs', amount: baseCosts.totalFinancing || 0 }
      ]
    },
    selling: {
      total: baseCosts.totalSelling || 0,
      items: [
        { name: 'Realtor Commission', amount: (parseFloat(deal.arv) || 0) * ((parseFloat(deal.realtor_commission) || 6) / 100) },
        { name: 'Closing Costs (Sell)', amount: (parseFloat(deal.arv) || 0) * ((parseFloat(deal.closing_costs_sell) || 3) / 100) }, // Distinct from buy closing
        { name: 'Staging', amount: parseFloat(deal.staging_costs) || 0 }
      ]
    },
    revenue: {
      arv: parseFloat(deal.arv) || 0,
      estimatedSalePrice: parseFloat(deal.arv) || 0
    }
  };

  // Add Hidden Costs
  if (Array.isArray(hiddenCosts)) {
    hiddenCosts.forEach(cost => {
      const probability = cost.probability || 100;
      const weightedAmount = (cost.amount || 0) * (probability / 100);
      const categoryKey = cost.category?.toLowerCase();
      
      if (breakdown[categoryKey]) {
        breakdown[categoryKey].items.push({ 
          name: `${cost.cost_name} (Hidden, ${probability}%)`, 
          amount: weightedAmount 
        });
      }
    });
  }

  // Re-sum totals
  Object.keys(breakdown).forEach(key => {
    if (key !== 'revenue' && breakdown[key]) {
      breakdown[key].total = breakdown[key].items.reduce((acc, item) => acc + (item.amount || 0), 0);
    }
  });

  const totalCosts = (breakdown.acquisition?.total || 0) + (breakdown.rehab?.total || 0) + (breakdown.holding?.total || 0) + (breakdown.selling?.total || 0);
  const netProfit = (breakdown.revenue?.arv || 0) - totalCosts;

  return {
    ...breakdown,
    summary: {
      totalCosts,
      revenue: breakdown.revenue?.arv || 0,
      netProfit,
      margin: breakdown.revenue?.arv ? (netProfit / breakdown.revenue.arv) * 100 : 0
    }
  };
};

export const calculateScenarioResults = (deal, adjustments, hiddenCostsTotal = 0) => {
  if (!deal) return {};

  const {
    rehabOverrunPercent = 0,
    holdingMonthAdjustment = 0,
    arvShiftPercent = 0,
    permitDelayWeeks = 0,
  } = adjustments || {};

  // 1. Rehab Impact
  const originalRehab = parseFloat(deal.rehab_costs) || 0;
  const rehabOverrunAmount = originalRehab * (rehabOverrunPercent / 100);
  const newRehabTotal = originalRehab + rehabOverrunAmount;

  // 2. Holding Impact (Time)
  const originalMonths = parseInt(deal.holding_months) || 6;
  const permitDelayMonths = (permitDelayWeeks * 7) / 30; // Approx
  const newHoldingMonths = originalMonths + holdingMonthAdjustment + permitDelayMonths;

  // 3. Holding Cost Calc (Rate)
  // Calculate monthly burn rate (Financing + Utils/Tax/Ins)
  const monthlyFinancing = calculateMonthlyFinancing(deal);
  const monthlySoftCosts = calculateMonthlySoftCosts(deal);
  const totalMonthlyHolding = monthlyFinancing + monthlySoftCosts;
  
  const newTotalHoldingCosts = totalMonthlyHolding * newHoldingMonths;

  // 4. ARV Impact
  const originalARV = parseFloat(deal.arv) || 0;
  const newARV = originalARV * (1 + (arvShiftPercent / 100));

  // 5. Selling Costs (affected by ARV)
  const commissionRate = (parseFloat(deal.realtor_commission) || 6) / 100;
  const closingRate = (parseFloat(deal.closing_costs_sell) || 3) / 100;
  const newSellingCosts = newARV * (commissionRate + closingRate) + (parseFloat(deal.staging_costs) || 0);

  // 6. Acquisition (Static usually)
  let acquisitionCosts = 0;
  try {
      const costs = aggregateCostsByCategory(deal);
      acquisitionCosts = (costs.purchasePrice || 0) + (costs.totalOther || 0) + ((parseFloat(deal.purchase_price) || 0) * 0.03);
  } catch (e) {
      acquisitionCosts = (parseFloat(deal.purchase_price) || 0);
  }

  const totalProjectedCosts = acquisitionCosts + newRehabTotal + newTotalHoldingCosts + newSellingCosts + hiddenCostsTotal;
  
  const netProfit = newARV - totalProjectedCosts;
  const roi = calculateROI(netProfit, acquisitionCosts + newRehabTotal + newTotalHoldingCosts); // Simplified investment basis
  const margin = calculateProfitMargin(netProfit, newARV);

  let originalProfit = 0;
  let originalTotalCosts = 0;
  try {
      const costs = aggregateCostsByCategory(deal);
      originalProfit = calculateNetProfit(originalARV, costs);
      originalTotalCosts = costs.totalCosts;
  } catch (e) {}

  return {
    newARV,
    newRehabTotal,
    newTotalHoldingCosts,
    newHoldingMonths,
    totalProjectedCosts,
    netProfit,
    roi,
    margin,
    impact: {
      profit: netProfit - originalProfit,
      costIncrease: totalProjectedCosts - originalTotalCosts
    }
  };
};

// Helper for monthly financing
const calculateMonthlyFinancing = (deal) => {
  if (!deal) return 0;
  const purchasePrice = parseFloat(deal.purchase_price) || 0;
  const downPaymentPercent = parseFloat(deal.down_payment_percent) || 0;
  const loanAmount = purchasePrice * (1 - (downPaymentPercent / 100));
  const rate = parseFloat(deal.hard_money_rate) || 0;
  return loanAmount * (rate / 100 / 12);
};

const calculateMonthlySoftCosts = (deal) => {
  if (!deal) return 0;
  return (
    (parseFloat(deal.utilities) || 0) +
    (parseFloat(deal.insurance) || 0) +
    ((parseFloat(deal.property_tax) || 0) / 12) +
    (parseFloat(deal.lawn_maintenance) || 0) +
    (parseFloat(deal.hoa) || 0)
  );
};

export const generateAlerts = (projectedMetrics) => {
  if (!projectedMetrics) return [];
  const alerts = [];
  if (projectedMetrics.roi < 10) alerts.push({ type: 'warning', message: 'ROI dropped below 10%' });
  if (projectedMetrics.netProfit < 0) alerts.push({ type: 'danger', message: 'Project is projected to lose money' });
  if (projectedMetrics.newHoldingMonths > 12) alerts.push({ type: 'warning', message: 'Timeline extends beyond 1 year' });
  return alerts;
};

export const calculateDealHealth = (roi, margin) => {
  if (roi > 15 && margin > 12) return 'healthy';
  if (roi > 8 && margin > 8) return 'caution';
  return 'critical';
};
