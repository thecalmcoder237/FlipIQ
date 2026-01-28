
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for safe interaction with Supabase Edge Functions.
 * Includes logging, error handling, and standardized response parsing.
 */

export const invokeEdgeFunction = async (functionName, payload) => {
  const timestamp = new Date().toISOString();
  console.log(`📤 [Edge Service] Request to '${functionName}' at ${timestamp}`, payload);

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`❌ [Edge Service] Supabase Invocation Error for '${functionName}':`, error);
      throw new Error(`Edge Function Error: ${error.message}`);
    }

    if (!data) {
        console.warn(`🔥 [Edge Service] '${functionName}' returned no data.`);
        return null;
    }

    if (data.error) {
        console.error(`❌ [Edge Service] '${functionName}' returned logic error:`, data.error);
        throw new Error(data.error);
    }

    console.log(`📥 [Edge Service] Success from '${functionName}':`, data);
    return data;

  } catch (err) {
    console.error(`🔥 [Edge Service] Critical failure invoking '${functionName}':`, err);
    throw err;
  }
};

export const fetchPropertyIntelligence = async (address, zipCode, propertyType, arv) => {
    return invokeEdgeFunction('fetch-property-intelligence', {
        address,
        zipCode,
        propertyType,
        arv
    });
};

export const generateRehabSOW = async (address, budget, propertyDetails, images = []) => {
    return invokeEdgeFunction('generate-rehab-sow', {
        userAddress: address,
        rehabBudget: budget || 0, // Optional reference, not a constraint
        propertyDescription: typeof propertyDetails === 'string' ? propertyDetails : JSON.stringify(propertyDetails),
        images: Array.isArray(images) ? images : []
    });
};

export const calculateCostBreakdown = async (dealData) => {
    // This might be a future edge function, currently client-side or mocked
    // For now we just log that we would call it
    console.log('🚧 [Edge Service] calculateCostBreakdown invoked (simulation)', dealData);
    return { success: true };
};
