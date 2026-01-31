
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

/**
 * Fetch property intelligence. Use normalized address (and optionally lat/lng) for more accurate results.
 * @param {string} address - Property address (use geocode formattedAddress when available)
 * @param {string} zipCode - 5-digit ZIP (use geocode postal when available for consistency)
 * @param {string} [propertyType] - e.g. "Single-Family"
 * @param {number} [arv] - After repair value
 * @param {{ formattedAddress?: string, lat?: number, lng?: number, city?: string, county?: string, propertyId?: string, userId?: string }} [options] - Optional: normalized address, coordinates, city/county, propertyId, and userId for rate limits
 */
export const fetchPropertyIntelligence = async (address, zipCode, propertyType, arv, options = {}) => {
    const body = {
        address: options.formattedAddress ?? address,
        zipCode: zipCode?.trim() || '',
        propertyType: propertyType || 'Single-Family',
        arv: Number(arv) || 0,
    };
    if (options.lat != null && options.lng != null && Number.isFinite(options.lat) && Number.isFinite(options.lng)) {
        body.lat = options.lat;
        body.lng = options.lng;
    }
    if (options.city) body.city = options.city;
    if (options.county) body.county = options.county;
    if (options.propertyId) body.propertyId = options.propertyId;
    if (options.userId) body.userId = options.userId;
    return invokeEdgeFunction('fetch-property-intelligence', body);
};

/**
 * Get current month API usage for property/comps (Realie and RentCast limits).
 * @param {string} userId - Authenticated user id
 * @returns {{ realie_count: number, rentcast_count: number, realie_limit: number, rentcast_limit: number, year_month: string }}
 */
/**
 * Get current month API usage for property/comps (Realie and RentCast limits).
 * Returns null if the edge function is unavailable (e.g. not deployed or CORS); app works without usage display.
 */
export const getPropertyApiUsage = async (userId) => {
    if (!userId) return null;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/d3874b50-fda2-4990-b7a4-de8818f92f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edgeFunctionService.js:getPropertyApiUsage',message:'invoke get-property-api-usage',data:{userId:userId?.slice(0,8)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      const result = await invokeEdgeFunction('get-property-api-usage', { userId });
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/d3874b50-fda2-4990-b7a4-de8818f92f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edgeFunctionService.js:getPropertyApiUsage',message:'get-property-api-usage success',data:{hasResult:!!result},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return result;
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/d3874b50-fda2-4990-b7a4-de8818f92f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edgeFunctionService.js:getPropertyApiUsage',message:'get-property-api-usage failed',data:{name:err?.name,message:err?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H5'})}).catch(()=>{});
      // #endregion
      return null;
    }
};

export const generateRehabSOW = async (address, budget, propertyDetails, images = []) => {
    return invokeEdgeFunction('generate-rehab-sow', {
        userAddress: address,
        rehabBudget: budget || 0, // Optional reference, not a constraint
        propertyDescription: typeof propertyDetails === 'string' ? propertyDetails : JSON.stringify(propertyDetails),
        images: Array.isArray(images) ? images : []
    });
};

/**
 * Vision-first Advanced Rehab Analysis: sends photos + per-photo analysis + deal context.
 * Returns structured property_details for deal.property_details.
 */
export const runAdvancedRehabAnalysis = async (deal, photoUrls = [], perPhotoAnalysis = []) => {
    return invokeEdgeFunction('generate-rehab-sow', {
        action: 'analyze',
        deal: {
            address: deal?.address,
            zipCode: deal?.zipCode ?? deal?.zip_code,
            propertyType: deal?.propertyType ?? deal?.property_type ?? 'Single-Family',
            arv: deal?.arv ?? 0,
            id: deal?.id,
            ...deal
        },
        images: Array.isArray(photoUrls) ? photoUrls : [],
        perPhotoAnalysis: Array.isArray(perPhotoAnalysis) ? perPhotoAnalysis : []
    });
};

export const calculateCostBreakdown = async (dealData) => {
    // This might be a future edge function, currently client-side or mocked
    // For now we just log that we would call it
    console.log('🚧 [Edge Service] calculateCostBreakdown invoked (simulation)', dealData);
    return { success: true };
};
