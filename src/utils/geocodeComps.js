/**
 * Geocode comp addresses that are missing latitude/longitude.
 *
 * Strategy:
 *   1. Try the `geocode-comps` Supabase Edge Function (GPT-powered, batch).
 *   2. If the edge function is unavailable, fall back to OpenStreetMap Nominatim
 *      (free, no API key, one-at-a-time with 1 s delay to respect rate limits).
 *
 * Returns a new array of comps with `latitude` and `longitude` filled in where
 * possible.  Comps that already have coordinates are returned as-is.
 */

import { invokeEdgeFunction } from '@/services/edgeFunctionService';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_DELAY_MS = 1100; // >1 s to respect Nominatim rate limit

function hasCoords(comp) {
  return (
    comp.latitude != null &&
    comp.longitude != null &&
    Number.isFinite(Number(comp.latitude)) &&
    Number.isFinite(Number(comp.longitude))
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeViaNominatim(address) {
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FlipIQ-Real-Estate-App/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  } catch {
    return null;
  }
}

async function geocodeViaEdgeFunction(addresses) {
  try {
    const data = await invokeEdgeFunction('geocode-comps', { addresses });
    if (data?.results && Array.isArray(data.results)) {
      return data.results;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {Array} comps – array of comp objects
 * @param {(progress: {done: number, total: number}) => void} [onProgress] – optional progress callback
 * @returns {Promise<Array>} – new array with coordinates filled in
 */
export async function geocodeComps(comps, onProgress) {
  if (!Array.isArray(comps) || comps.length === 0) return comps;

  const needsGeocode = [];
  const indexMap = {};

  comps.forEach((comp, i) => {
    if (!hasCoords(comp) && comp.address) {
      needsGeocode.push({ index: i, address: comp.address });
      indexMap[i] = true;
    }
  });

  if (needsGeocode.length === 0) return comps;

  const geocoded = {};
  let edgeFunctionWorked = false;

  // Try edge function first (batch GPT geocoding)
  const edgeResults = await geocodeViaEdgeFunction(
    needsGeocode.map((n) => ({ index: n.index, address: n.address }))
  );

  if (edgeResults) {
    edgeFunctionWorked = true;
    for (const r of edgeResults) {
      if (r.latitude != null && r.longitude != null) {
        geocoded[r.index] = { latitude: r.latitude, longitude: r.longitude };
      }
    }
  }

  // Fall back to Nominatim for any that weren't resolved
  const stillNeed = needsGeocode.filter((n) => !geocoded[n.index]);

  if (stillNeed.length > 0 && !edgeFunctionWorked) {
    let done = Object.keys(geocoded).length;
    const total = needsGeocode.length;

    for (let i = 0; i < stillNeed.length; i++) {
      const { index, address } = stillNeed[i];
      const result = await geocodeViaNominatim(address);
      if (result) {
        geocoded[index] = result;
      }
      done++;
      if (onProgress) onProgress({ done, total });
      if (i < stillNeed.length - 1) await sleep(NOMINATIM_DELAY_MS);
    }
  }

  // Merge coordinates back into comps
  return comps.map((comp, i) => {
    if (geocoded[i]) {
      return { ...comp, ...geocoded[i] };
    }
    return comp;
  });
}

export default geocodeComps;
