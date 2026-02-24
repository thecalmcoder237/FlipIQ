
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for safe interaction with Supabase Edge Functions.
 * Includes logging, error handling, and standardized response parsing.
 */

/**
 * Updates deal SOW context (sow_context_messages) via edge function.
 * Uses service role to bypass RLS so any authenticated user who can view the deal can add/remove context.
 * @param {string} dealId
 * @param {string[]} sowContextMessages
 */
export const updateDealSowContext = async (dealId, sowContextMessages) => {
  const body = { dealId, sowContextMessages: Array.isArray(sowContextMessages) ? sowContextMessages : [] };
  const data = await invokeEdgeFunction('update-deal-sow-context', body);
  return data?.deal ?? data;
};

/**
 * Saves generated SOW text via admin-client edge function (bypasses RLS).
 * Use when dealService.saveDeal may be blocked by user_id mismatch.
 * @param {string} dealId
 * @param {string} rehabSow - The generated SOW markdown text
 */
export const updateDealRehabSow = async (dealId, rehabSow) => {
  const body = { dealId, rehabSow };
  const data = await invokeEdgeFunction('update-deal-sow-context', body);
  return data?.deal ?? data;
};

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
 * @param {{ formattedAddress?: string, lat?: number, lng?: number, city?: string, county?: string, state?: string, propertyId?: string, userId?: string }} [options] - Optional: normalized address, coordinates, city/county/state, propertyId, userId
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
    if (options.state && options.state.trim().length >= 2) body.state = options.state.trim().slice(0, 2).toUpperCase();
    if (options.propertyId) body.propertyId = options.propertyId;
    if (options.userId) body.userId = options.userId;
    if (options.debug === true || (typeof localStorage !== 'undefined' && localStorage.getItem('propertyIntelDebug') === '1')) body.debug = true;
    return invokeEdgeFunction('fetch-property-intelligence', body);
};

/**
 * Fetch comps only (Realie Premium Comparables with RentCast fallback). Use with fetch-property-intelligence; UI merges property + comps.
 * @param {string} address - Property address
 * @param {string} zipCode - 5-digit ZIP
 * @param {{ city?: string, state?: string, propertyId?: string, subjectAddress?: string, subjectSpecs?: { bedrooms?: number, bathrooms?: number }, lat?: number, lng?: number, userId?: string, debug?: boolean }} [options] - Optional: city, state, propertyId, subjectAddress (for excluding subject from comps), subjectSpecs (for bed/bath filtering), lat/lng (required for Realie comps - pass from property response), userId, debug
 */
export const fetchComps = async (address, zipCode, options = {}) => {
    const body = {
        address: options.formattedAddress ?? address,
        zipCode: String(zipCode ?? '').trim().replace(/\D/g, '').slice(0, 5) || '',
    };
    if (options.city) body.city = options.city;
    if (options.state && String(options.state).trim().length >= 2) body.state = String(options.state).trim().slice(0, 2).toUpperCase();
    if (options.propertyId) body.propertyId = options.propertyId;
    if (options.subjectAddress) body.subjectAddress = options.subjectAddress;
    if (options.subjectSpecs && typeof options.subjectSpecs === 'object' && (options.subjectSpecs.bedrooms != null || options.subjectSpecs.bathrooms != null)) {
        body.subjectSpecs = options.subjectSpecs;
    }
    // lat/lng enables Realie Premium Comparables (coordinate-based search); pass from property response when available
    if (options.lat != null && options.lng != null && Number.isFinite(Number(options.lat)) && Number.isFinite(Number(options.lng))) {
        body.lat = Number(options.lat);
        body.lng = Number(options.lng);
    }
    if (options.userId) body.userId = options.userId;
    if (options.debug === true || (typeof localStorage !== 'undefined' && localStorage.getItem('propertyIntelDebug') === '1')) body.debug = true;
    return invokeEdgeFunction('fetch-comps', body);
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
    try {
      const result = await invokeEdgeFunction('get-property-api-usage', { userId });
      return result;
    } catch (err) {
      return null;
    }
};

/**
 * Reset RentCast API usage count for the current month (e.g. when a new plan period starts).
 * @param {string} userId - Authenticated user id
 * @returns {{ realie_count: number, rentcast_count: number, realie_limit: number, rentcast_limit: number, year_month: string }} Updated usage
 */
export const resetPropertyApiUsage = async (userId) => {
    if (!userId) return null;
    try {
      return await invokeEdgeFunction('get-property-api-usage', { userId, action: 'reset' });
    } catch (err) {
      return null;
    }
};

/**
 * Generate rehab SOW. Pass full property data, deal summary, and comps so Claude can use them.
 * @param {string} address
 * @param {number} budget
 * @param {string|object} propertyDetails - Property intelligence / description
 * @param {string[]} images - Photo URLs
 * @param {{ deal?: object, recentComps?: array, compsSummary?: string }} [options] - Deal summary and comps for accuracy and recommendations
 */
export const generateRehabSOW = async (address, budget, propertyDetails, images = [], options = {}) => {
    const payload = {
        userAddress: address,
        rehabBudget: budget || 0,
        propertyDescription: typeof propertyDetails === 'string' ? propertyDetails : JSON.stringify(propertyDetails || {}),
        images: Array.isArray(images) ? images : []
    };
    if (options.deal && typeof options.deal === 'object') {
        payload.deal = options.deal;
    }
    if (Array.isArray(options.recentComps) && options.recentComps.length > 0) {
        payload.recentComps = options.recentComps;
    }
    if (typeof options.compsSummary === 'string' && options.compsSummary.trim()) {
        payload.compsSummary = options.compsSummary.trim();
    }
    if (Array.isArray(options.sowContextMessages) && options.sowContextMessages.length > 0) {
        payload.sowContextMessages = options.sowContextMessages.filter((m) => typeof m === 'string' && m.trim());
    }
    return invokeEdgeFunction('generate-rehab-sow', payload);
};

/**
 * Vision-first Advanced Rehab Analysis: sends photos + per-photo analysis + deal context.
 * Returns structured property_details for deal.property_details.
 * Includes userAddress and rehabBudget so server validation (if any) passes; analyze path ignores them.
 */
export const runAdvancedRehabAnalysis = async (deal, photoUrls = [], perPhotoAnalysis = []) => {
    const payload = {
        action: 'analyze',
        userAddress: deal?.address ?? deal?.formattedAddress ?? '',
        rehabBudget: Number(deal?.rehabCosts ?? deal?.rehab_costs ?? 0) || 0,
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
    };
    return invokeEdgeFunction('generate-rehab-sow', payload);
};

/**
 * Fetch neighborhood and location intelligence for a property address.
 * Returns demographics, purchasing power, schools, landmarks, shopping, neighboring towns,
 * road type/traffic context, and Street View URL (if Google Maps key is configured).
 * @param {string} address - Full property address
 * @param {string} zipCode - 5-digit ZIP code
 * @param {{ city?: string, state?: string, county?: string, lat?: number, lng?: number }} [options]
 */
export const fetchNeighborhoodIntelligence = async (address, zipCode, options = {}) => {
    const body = {
        address,
        zipCode: String(zipCode ?? '').trim().replace(/\D/g, '').slice(0, 5),
    };
    if (options.city) body.city = options.city;
    if (options.state && String(options.state).trim().length >= 2) body.state = String(options.state).trim().slice(0, 2).toUpperCase();
    if (options.county) body.county = options.county;
    if (options.lat != null && options.lng != null && Number.isFinite(Number(options.lat)) && Number.isFinite(Number(options.lng))) {
        body.lat = Number(options.lat);
        body.lng = Number(options.lng);
    }
    return invokeEdgeFunction('fetch-neighborhood-intelligence', body);
};

export const calculateCostBreakdown = async (dealData) => {
    // This might be a future edge function, currently client-side or mocked
    // For now we just log that we would call it
    console.log('🚧 [Edge Service] calculateCostBreakdown invoked (simulation)', dealData);
    return { success: true };
};
