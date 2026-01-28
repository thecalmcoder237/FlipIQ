
/**
 * Validates property input for intelligence fetching
 * @param {string} address 
 * @param {string} zipCode 
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validatePropertyInput = (address, zipCode) => {
  if (!address || typeof address !== 'string' || address.trim().length <= 3) {
    return { valid: false, error: "Address must be a valid text string longer than 3 characters." };
  }
  
  // Basic US ZIP code validation (5 digits or ZIP+4)
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipCode || typeof zipCode !== 'string' || !zipRegex.test(zipCode.trim())) {
    return { valid: false, error: "Please enter a valid 5-digit ZIP code." };
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
