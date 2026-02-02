
/**
 * Maps camelCase application inputs to snake_case database columns.
 * Handles type conversion and default values.
 * Ensures bidirectional consistency for robust data handling.
 */

export const inputsToDatabase = (inputs) => {
  if (!inputs) return {};

  // Create the payload object explicitly to avoid including non-existent columns
  const payload = {
    // Basic Info (Realie: address = street line 1 or full; zipCode for state; optional city/county)
    address: inputs.address || '',
    zip_code: inputs.zipCode || '',
    city: inputs.city || '',
    county: inputs.county || '',
    property_type: inputs.propertyType || 'Single-Family',
    status: inputs.status || 'Analyzing',
    is_favorite: inputs.isFavorite || false,
    notes: inputs.notes || '',

    // Property Specs (handling both legacy sqft and new square_footage)
    bedrooms: parseInt(inputs.bedrooms) || 0,
    bathrooms: parseFloat(inputs.bathrooms) || 0,
    sqft: parseInt(inputs.squareFootage || inputs.sqft) || 0,
    square_footage: parseInt(inputs.squareFootage || inputs.sqft) || 0,
    year_built: parseInt(inputs.yearBuilt) || 0,
    
    // Purchase & Acquisition
    purchase_price: parseFloat(inputs.purchasePrice) || 0,
    arv: parseFloat(inputs.arv) || 0,
    down_payment_percent: parseFloat(inputs.downPaymentPercent) || 20,
    
    // Detailed Acquisition Costs
    closing_costs: parseFloat(inputs.closingCostsBuying || inputs.closingCosts) || 0, // Legacy
    closing_costs_buying: parseFloat(inputs.closingCostsBuying || inputs.closingCosts) || 0, // New
    closing_costs_buyer: parseFloat(inputs.closingCostsBuying || inputs.closingCosts) || 0, // Legacy alt
    
    inspection_costs: parseFloat(inputs.inspectionCost || inputs.inspectionCosts) || 0,
    inspection_cost: parseFloat(inputs.inspectionCost || inputs.inspectionCosts) || 0, // Alias
    appraisal_costs: parseFloat(inputs.appraisalCost || inputs.appraisalCosts) || 0,
    appraisal_cost: parseFloat(inputs.appraisalCost || inputs.appraisalCosts) || 0, // Alias
    title_costs: parseFloat(inputs.titleInsurance || inputs.titleCosts) || 0,
    title_insurance: parseFloat(inputs.titleInsurance || inputs.titleCosts) || 0, // Alias
    transfer_tax_rate: parseFloat(inputs.transferTaxRate) || 0,
    
    // Financing
    hard_money_rate: parseFloat(inputs.hardMoneyRate) || 0,
    hard_money_points: parseFloat(inputs.hardMoneyPoints) || 0,
    buyer_financing_fallthrough_percent: parseFloat(inputs.buyerFinancingFallthrough) || 0,
    buyer_financing_fallthrough: parseFloat(inputs.buyerFinancingFallthrough) || 0, // New numeric
    
    // Rehab
    rehab_costs: parseFloat(inputs.rehabCosts) || 0,
    rehab_category: inputs.rehabCategory || 'Cosmetic',
    rehab_overrun_percent: parseFloat(inputs.rehabOverrunPercent) || 0,
    contingency_percent: parseFloat(inputs.contingencyPercent) || 0,
    permit_inspection_fees: parseFloat(inputs.permitFees) || 0,
    permit_fees: parseFloat(inputs.permitFees) || 0, // New
    permit_delay_months: parseInt(inputs.permitDelayMonths) || 0,
    
    // Timeline & Holding
    holding_months: parseInt(inputs.holdingMonths) || 6,
    property_tax: parseFloat(inputs.propertyTax) || 0,
    insurance: parseFloat(inputs.insurance) || 0,
    utilities: parseFloat(inputs.utilities) || 0,
    hoa: parseFloat(inputs.hoa) || 0,
    lawn_maintenance: parseFloat(inputs.lawnMaintenance) || 0,
    
    // Selling
    realtor_commission_percent: parseFloat(inputs.realtorCommission) || 6,
    seller_closing_costs_percent: parseFloat(inputs.closingCostsSelling) || 3,
    closing_costs_selling: parseFloat(inputs.closingCostsSellingAmount) || 0, // If storing amount
    staging_costs: parseFloat(inputs.stagingCost) || 0,
    staging_cost: parseFloat(inputs.stagingCost) || 0, // Alias
    marketing_cost: parseFloat(inputs.marketingCost) || 0,
    
    // Market & Intelligence
    market_appreciation_percent: parseFloat(inputs.marketAppreciationPercent) || 0,
    scenario_prediction_enabled: inputs.scenarioPredictionEnabled === true,
    property_intelligence: inputs.propertyIntelligence || null,
    rehab_sow: inputs.rehabSow || null,
    recent_comps: inputs.recentComps || [],

    // Photos and scan results (stored per deal to avoid repeated API calls)
    photos: Array.isArray(inputs.photos) ? inputs.photos : [],
    property_details: inputs.property_details ?? inputs.propertyDetails ?? null,
    
    // Scenarios Handling
    // CRITICAL: Do NOT map 'scenarios' array here. Scenarios are stored in a separate table.
    // Only map the active scenario ID reference.
    active_scenario_id: inputs.activeScenarioId || null,
    
    // Calculated Metrics (Persisted for sorting/filtering)
    deal_score: parseFloat(inputs.dealScore) || 0,
    risk_level: inputs.riskLevel || 'Medium',
    total_cash_invested: parseFloat(inputs.totalCashNeeded) || 0,
    total_project_cost: parseFloat(inputs.totalProjectCost) || 0,
    gross_profit: parseFloat(inputs.grossProfit) || 0,
    net_profit: parseFloat(inputs.netProfit) || 0,
    roi_percent: parseFloat(inputs.roi) || 0,
    annualized_roi: parseFloat(inputs.annualizedRoi) || 0,
    profit_margin_percent: parseFloat(inputs.profitMargin) || 0,

    // Funding approved
    amount_approved: inputs.amountApproved != null && inputs.amountApproved !== '' ? parseFloat(inputs.amountApproved) : null,
    ltv_percent: inputs.ltvPercent != null && inputs.ltvPercent !== '' ? parseFloat(inputs.ltvPercent) : null,
    funding_rate_percent: inputs.fundingRatePercent != null && inputs.fundingRatePercent !== '' ? parseFloat(inputs.fundingRatePercent) : null,
    funding_term_months: inputs.fundingTermMonths != null && inputs.fundingTermMonths !== '' ? parseInt(inputs.fundingTermMonths, 10) : null,
    funding_source: inputs.fundingSource || null,

    // Deal contact / source
    deal_agent_name: inputs.dealAgentName || null,
    deal_agent_phone: inputs.dealAgentPhone || null,
    deal_agent_email: inputs.dealAgentEmail || null,
    deal_source_type: inputs.dealSourceType || null,

    // Status / closed / funded
    is_closed: inputs.isClosed === true,
    is_funded: inputs.isFunded === true,
    funded_terms: inputs.fundedTerms || null,
  };

  return payload;
};

/**
 * Maps snake_case database columns to camelCase application inputs.
 */
export const databaseToInputs = (dbRecord) => {
  if (!dbRecord) return {};

  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    
    // Basic Info
    address: dbRecord.address || '',
    zipCode: dbRecord.zip_code || '',
    city: dbRecord.city || '',
    county: dbRecord.county || '',
    propertyType: dbRecord.property_type || 'Single-Family',
    status: dbRecord.status || 'Analyzing',
    isFavorite: dbRecord.is_favorite || false,
    notes: dbRecord.notes || '',

    // Property Specs
    bedrooms: dbRecord.bedrooms || 0,
    bathrooms: dbRecord.bathrooms || 0,
    squareFootage: dbRecord.square_footage || dbRecord.sqft || 0,
    sqft: dbRecord.square_footage || dbRecord.sqft || 0,
    yearBuilt: dbRecord.year_built || 0,
    
    // Purchase & Acquisition
    purchasePrice: dbRecord.purchase_price || 0,
    arv: dbRecord.arv || 0,
    downPaymentPercent: dbRecord.down_payment_percent || 20,
    
    // Detailed Acquisition Costs
    closingCostsBuying: dbRecord.closing_costs_buying || dbRecord.closing_costs_buyer || dbRecord.closing_costs || 0,
    closingCosts: dbRecord.closing_costs_buying || dbRecord.closing_costs_buyer || dbRecord.closing_costs || 0,
    
    inspectionCost: dbRecord.inspection_costs || dbRecord.inspection_cost || 0,
    inspectionCosts: dbRecord.inspection_costs || dbRecord.inspection_cost || 0,
    appraisalCost: dbRecord.appraisal_costs || dbRecord.appraisal_cost || 0,
    appraisalCosts: dbRecord.appraisal_costs || dbRecord.appraisal_cost || 0,
    titleInsurance: dbRecord.title_costs || dbRecord.title_insurance || 0,
    titleCosts: dbRecord.title_costs || dbRecord.title_insurance || 0,
    transferTaxRate: dbRecord.transfer_tax_rate || 0,
    
    // Financing
    hardMoneyRate: dbRecord.hard_money_rate || 0,
    hardMoneyPoints: dbRecord.hard_money_points || 0,
    buyerFinancingFallthrough: dbRecord.buyer_financing_fallthrough || dbRecord.buyer_financing_fallthrough_percent || 0,
    
    // Rehab
    rehabCosts: dbRecord.rehab_costs || 0,
    rehabCategory: dbRecord.rehab_category || 'Cosmetic',
    rehabOverrunPercent: dbRecord.rehab_overrun_percent || 0,
    contingencyPercent: dbRecord.contingency_percent || 0,
    permitFees: dbRecord.permit_fees || dbRecord.permit_inspection_fees || 0,
    permitDelayMonths: dbRecord.permit_delay_months || 0,
    
    // Timeline & Holding
    holdingMonths: dbRecord.holding_months || 6,
    propertyTax: dbRecord.property_tax || 0,
    insurance: dbRecord.insurance || 0,
    utilities: dbRecord.utilities || 0,
    hoa: dbRecord.hoa || 0,
    lawnMaintenance: dbRecord.lawn_maintenance || 0,
    
    // Selling
    realtorCommission: dbRecord.realtor_commission_percent || 6,
    closingCostsSelling: dbRecord.seller_closing_costs_percent || 3, // Percent usually
    closingCostsSellingAmount: dbRecord.closing_costs_selling || 0,
    stagingCost: dbRecord.staging_costs || dbRecord.staging_cost || 0,
    marketingCost: dbRecord.marketing_cost || 0,
    
    // Market & Intelligence
    marketAppreciationPercent: dbRecord.market_appreciation_percent || 0,
    scenarioPredictionEnabled: dbRecord.scenario_prediction_enabled === true,
    propertyIntelligence: dbRecord.property_intelligence || null,
    rehabSow: dbRecord.rehab_sow || null,
    recentComps: dbRecord.recent_comps || [],

    // Photos and scan results (loaded with deal)
    photos: Array.isArray(dbRecord.photos) ? dbRecord.photos : [],
    property_details: dbRecord.property_details ?? null,

    // Scenarios
    // Map the joined scenarios array if it exists (from select('*, scenarios(*)'))
    scenarios: Array.isArray(dbRecord.scenarios) ? dbRecord.scenarios : [],
    activeScenarioId: dbRecord.active_scenario_id || null,

    // Metrics (for read-only display or init)
    dealScore: dbRecord.deal_score || 0,
    riskLevel: dbRecord.risk_level || 'Medium',
    totalCashNeeded: dbRecord.total_cash_invested || 0,
    totalProjectCost: dbRecord.total_project_cost || 0,
    grossProfit: dbRecord.gross_profit || 0,
    netProfit: dbRecord.net_profit || 0,
    roi: dbRecord.roi_percent || 0,
    annualizedRoi: dbRecord.annualized_roi || 0,
    profitMargin: dbRecord.profit_margin_percent || 0,

    // Funding approved
    amountApproved: dbRecord.amount_approved != null ? dbRecord.amount_approved : null,
    ltvPercent: dbRecord.ltv_percent != null ? dbRecord.ltv_percent : null,
    fundingRatePercent: dbRecord.funding_rate_percent != null ? dbRecord.funding_rate_percent : null,
    fundingTermMonths: dbRecord.funding_term_months != null ? dbRecord.funding_term_months : null,
    fundingSource: dbRecord.funding_source || null,

    // Deal contact / source
    dealAgentName: dbRecord.deal_agent_name || null,
    dealAgentPhone: dbRecord.deal_agent_phone || null,
    dealAgentEmail: dbRecord.deal_agent_email || null,
    dealSourceType: dbRecord.deal_source_type || null,

    // Status / closed / funded
    isClosed: dbRecord.is_closed === true,
    isFunded: dbRecord.is_funded === true,
    fundedTerms: dbRecord.funded_terms || null,
  };
};
