/**
 * Geocode comp addresses that are missing latitude/longitude.
 *
 * Strategy:
 *   1. Try the `geocode-comps` Supabase Edge Function (GPT-powered, batch).
 *   2. If the edge function is unavailable, fall back to the Google Maps
 *      Geocoder (already loaded via @react-google-maps/api for the CompsMap).
 *
 * Returns a new array of comps with `latitude` and `longitude` filled in where
 * possible.  Comps that already have coordinates are returned as-is.
 */

import { invokeEdgeFunction } from '@/services/edgeFunctionService';

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

/**
 * Geocode a single address using the Google Maps Geocoder.
 * The Maps JS API must already be loaded (via GoogleMapsProvider).
 */
function geocodeViaGoogleMaps(address) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) {
      resolve(null);
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        const loc = results[0].geometry.location;
        resolve({ latitude: loc.lat(), longitude: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
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
  comps.forEach((comp, i) => {
    if (!hasCoords(comp) && comp.address) {
      needsGeocode.push({ index: i, address: comp.address });
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

  // Fall back to Google Maps Geocoder for any not resolved by edge function
  const stillNeed = needsGeocode.filter((n) => !geocoded[n.index]);

  if (stillNeed.length > 0 && !edgeFunctionWorked) {
    let done = Object.keys(geocoded).length;
    const total = needsGeocode.length;

    for (let i = 0; i < stillNeed.length; i++) {
      const { index, address } = stillNeed[i];
      const result = await geocodeViaGoogleMaps(address);
      if (result) {
        geocoded[index] = result;
      }
      done++;
      if (onProgress) onProgress({ done, total });
      // Small delay between requests to avoid rate-limit issues
      if (i < stillNeed.length - 1) await sleep(300);
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
