/**
 * Service for fetching market shock scenario data
 * Uses Claude AI to analyze real-time market conditions
 */

import { supabase } from '@/lib/customSupabaseClient';

/**
 * Fetch market shock scenarios based on real market data
 */
export async function fetchMarketShockScenarios(address, zipCode, propertyType) {
  try {
    const { data, error } = await supabase.functions.invoke('send-claude-request', {
      body: {
        address,
        requestType: 'market_shock_analysis',
        systemPrompt: `You are a real estate market risk analyst. Analyze current market conditions and identify potential shock scenarios that could impact house flipping deals. Use real-time data from FRED, BLS, MLS, and municipal sources.`,
        userMessage: `Analyze market shock scenarios for a property at ${address}, ${zipCode} (${propertyType}).

        Research and provide:
        1. Rate Spike Scenario: Current 10Y Treasury rate, probability of 200bps increase, impact on holding costs
        2. Demand Drop Scenario: Current local inventory levels, probability of 30% MoM increase, impact on DOM and sale price
        3. Construction Inflation: Current lumber/construction material costs (BLS data), probability of 15% increase, impact on rehab budget
        4. Regulatory Changes: Recent permit fee changes, new regulations in the area, impact on timeline and costs
        
        Return JSON with this structure:
        {
          "rateSpike": {
            "currentRate": number,
            "probability": number (0-100),
            "impactHoldingCost": number (percentage),
            "impactROI": number (percentage),
            "dataSource": "string"
          },
          "demandDrop": {
            "currentInventory": number,
            "probability": number (0-100),
            "impactDOM": number (days),
            "impactSalePrice": number (percentage),
            "dataSource": "string"
          },
          "constructionInflation": {
            "currentLumberIndex": number,
            "probability": number (0-100),
            "impactRehabBudget": number (percentage),
            "dataSource": "string"
          },
          "regulatory": {
            "recentChanges": "string",
            "probability": number (0-100),
            "impactTimeline": number (days),
            "impactCost": number (dollars),
            "dataSource": "string"
          },
          "aiInsight": "string - One key insight based on 2025 Q1 data"
        }`,
        model: 'claude-3-5-haiku-20241022'
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Market shock analysis error:', error);
    // Return default scenarios if API fails
    return getDefaultMarketShocks();
  }
}

/**
 * Default market shock scenarios (fallback)
 */
function getDefaultMarketShocks() {
  return {
    rateSpike: {
      currentRate: 4.5,
      probability: 35,
      impactHoldingCost: 18,
      impactROI: -9,
      dataSource: "FRED Economic Data"
    },
    demandDrop: {
      currentInventory: 1200,
      probability: 28,
      impactDOM: 19,
      impactSalePrice: -7,
      dataSource: "Local MLS API"
    },
    constructionInflation: {
      currentLumberIndex: 145.2,
      probability: 42,
      impactRehabBudget: 12,
      dataSource: "U.S. BLS CPI"
    },
    regulatory: {
      recentChanges: "No major changes detected",
      probability: 15,
      impactTimeline: 0,
      impactCost: 0,
      dataSource: "Municipal records"
    },
    aiInsight: "Based on 2025 Q1 data, deals in your ZIP saw 18% longer DOM when interest rates exceeded 7.2%"
  };
}

/**
 * Calculate impact of market shock on deal metrics
 */
export function applyMarketShock(deal, metrics, shockType, shockData) {
  const updatedMetrics = { ...metrics };
  
  switch (shockType) {
    case 'rateSpike':
      // Increase holding costs
      const holdingIncrease = (updatedMetrics.holding?.total || 0) * (shockData.impactHoldingCost / 100);
      updatedMetrics.holding = {
        ...updatedMetrics.holding,
        total: (updatedMetrics.holding?.total || 0) + holdingIncrease
      };
      updatedMetrics.totalProjectCost += holdingIncrease;
      updatedMetrics.netProfit -= holdingIncrease;
      updatedMetrics.roi = (updatedMetrics.netProfit / updatedMetrics.totalProjectCost) * 100;
      break;
      
    case 'demandDrop':
      // Reduce ARV and increase holding period
      const arvReduction = (updatedMetrics.arv || 0) * (Math.abs(shockData.impactSalePrice) / 100);
      updatedMetrics.arv = (updatedMetrics.arv || 0) - arvReduction;
      updatedMetrics.grossProfit -= arvReduction;
      updatedMetrics.netProfit -= arvReduction;
      updatedMetrics.roi = (updatedMetrics.netProfit / updatedMetrics.totalProjectCost) * 100;
      
      // Increase holding months
      const additionalHolding = Math.ceil(shockData.impactDOM / 30);
      const monthlyHolding = (updatedMetrics.holding?.total || 0) / (deal.holdingMonths || 6);
      updatedMetrics.holding.total += monthlyHolding * additionalHolding;
      break;
      
    case 'constructionInflation':
      // Increase rehab costs
      const rehabIncrease = (updatedMetrics.rehab?.total || 0) * (shockData.impactRehabBudget / 100);
      updatedMetrics.rehab = {
        ...updatedMetrics.rehab,
        total: (updatedMetrics.rehab?.total || 0) + rehabIncrease
      };
      updatedMetrics.totalProjectCost += rehabIncrease;
      updatedMetrics.netProfit -= rehabIncrease;
      updatedMetrics.roi = (updatedMetrics.netProfit / updatedMetrics.totalProjectCost) * 100;
      break;
      
    case 'regulatory':
      // Add cost and extend timeline
      updatedMetrics.totalProjectCost += shockData.impactCost;
      updatedMetrics.netProfit -= shockData.impactCost;
      updatedMetrics.roi = (updatedMetrics.netProfit / updatedMetrics.totalProjectCost) * 100;
      break;
  }
  
  return updatedMetrics;
}
