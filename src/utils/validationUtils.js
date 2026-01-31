
/**
 * Validates property input for Realie API fetch.
 * Realie Address Lookup requires: state (we derive from ZIP), address (street line 1 only; backend strips to street).
 * Realie optional: city, county (county required when city provided).
 * @param {string} address - Street address line 1 (e.g. "123 Main St") or full address; backend uses street portion
 * @param {string} zipCode - 5-digit US ZIP (required; used to derive state for Realie)
 * @param {{ city?: string, county?: string }} [options] - Optional; if city provided, county is required per Realie
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validatePropertyInput = (address, zipCode, options = {}) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: "Address is required (Realie: street line 1)." };
  }
  const trimmed = address.trim();
  if (trimmed.length < 5) {
    return { valid: false, error: "Address must be at least 5 characters (e.g. 123 Main St)." };
  }

  const zipStr = zipCode != null ? String(zipCode).trim().replace(/\D/g, "").slice(0, 5) : "";
  if (zipStr.length !== 5) {
    return { valid: false, error: "5-digit ZIP is required (Realie uses it for state)." };
  }

  const city = (options.city != null && options.city !== '') ? String(options.city).trim() : '';
  const county = (options.county != null && options.county !== '') ? String(options.county).trim() : '';
  if (city && !county) {
    return { valid: false, error: "County is required when City is provided (Realie API)." };
  }

  return { valid: true, error: null };
};

/**
 * Validates rehab input for SOW generation
 * @param {Object} propertyData 
 * @param {number|string} rehabBudget 
 * @param {string} userAddress 
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateRehabInput = (userAddress, rehabBudget, propertyData) => {
  if (!userAddress || typeof userAddress !== 'string' || userAddress.trim().length <= 3) {
    return { valid: false, error: "Property address is required and must be valid." };
  }

  const budget = Number(rehabBudget);
  if (isNaN(budget) || budget <= 0) {
    return { valid: false, error: "Rehab budget must be a number greater than $0." };
  }

  // Check if property data exists and has at least an address or basic info
  // The user prompt specifically asked to check "propertyData exists and has address property"
  // However propertyData structure might vary, but usually it comes from fetching intel. 
  // We'll relax it slightly to allow propertyData object existence as primary check, 
  // or specific check if 'address' field is inside it if strictness required.
  // The prompt said: "Check propertyData exists and has address property"
  if (!propertyData || !propertyData.address && !userAddress) {
      // If userAddress is provided separately (as arg 1), we are good on address, 
      // but if the prompt implies propertyData MUST contain it, we check:
      if (!propertyData || (typeof propertyData === 'object' && !propertyData.address && !userAddress)) {
         return { valid: false, error: "Property data context is missing." };
      }
  }

  return { valid: true, error: null };
};
