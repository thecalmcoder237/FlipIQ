
/**
 * Utility for comprehensive data flow logging and validation.
 * Helps trace data from input -> database -> loading -> state -> UI.
 */

export const logDataFlow = (stage, data, timestamp = new Date()) => {
  // Replaced process.env.NODE_ENV with import.meta.env.MODE for Vite compatibility
  if (import.meta.env.MODE === 'development') {
    const timeStr = timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    const color = getStageColor(stage);
    
    console.groupCollapsed(`%c🌊 [${timeStr}] DATA FLOW: ${stage}`, `color: ${color}; font-weight: bold`);
    console.log('Timestamp:', timestamp.toISOString());
    console.log('Payload:', data);
    console.log('Type:', typeof data);
    if (data && typeof data === 'object') {
        console.log('Keys:', Object.keys(data));
    }
    console.groupEnd();
  }
};

const getStageColor = (stage) => {
    if (stage.includes('ERROR')) return '#ff4444';
    if (stage.includes('DB')) return '#44ffaa';
    if (stage.includes('INPUT')) return '#44aaff';
    if (stage.includes('CALC')) return '#ffaa44';
    return '#aaaaaa';
};

export const validateDealData = (data) => {
    if (!data) return { isValid: false, issues: ['Data object is null or undefined'] };

    // Check for required DB columns presence (snake_case)
    const requiredFields = ['address', 'purchase_price', 'arv', 'rehab_costs'];
    const missing = requiredFields.filter(f => data[f] === undefined || data[f] === null);
    
    // Check specific types
    const invalidTypes = [];
    if (data.purchase_price !== undefined && typeof data.purchase_price !== 'number') invalidTypes.push('purchase_price must be number');
    
    return {
        isValid: missing.length === 0 && invalidTypes.length === 0,
        missingFields: missing,
        invalidTypes,
        issues: [...missing.map(f => `Missing DB field: ${f}`), ...invalidTypes]
    };
};

export const validateInputs = (inputs) => {
    if (!inputs) return { isValid: false, issues: ['Inputs object is null'] };

    // Check for required camelCase inputs
    const required = ['address', 'zipCode', 'purchasePrice', 'arv', 'rehabCosts'];
    const missing = required.filter(f => !inputs[f] || (typeof inputs[f] === 'string' && inputs[f].trim() === ''));
    
    return {
        isValid: missing.length === 0,
        missingFields: missing,
        issues: missing.map(f => `Missing required input: ${f}`)
    };
};

export const validateCalculations = (calculations) => {
    if (!calculations) return { isValid: false, issues: ['No calculations object generated'] };
    
    const issues = [];
    if (typeof calculations.score !== 'number') issues.push('dealScore is not a number');
    if (calculations.score < 0 || calculations.score > 100) issues.push(`dealScore out of range: ${calculations.score}`);
    if (!calculations.risk) issues.push('Missing risk level');
    if (typeof calculations.netProfit !== 'number') issues.push('netProfit is not a number');
    
    return {
        isValid: issues.length === 0,
        issues
    };
};
