/**
 * Geocode comp addresses that are missing latitude/longitude.
 *
 * Strategy:
 *   1. Try the `geocode-comps` Supabase Edge Function (GPT-powered, batch).
 *   2. If the edge function is unavailable, fall back to the Google Maps
 *      Geocoder (already loaded via @react-google-maps/api for the CompsMap).
 *   3. If Google Maps Geocoder also fails, try OpenStreetMap Nominatim.
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

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Geocode a single address using the Google Maps Geocoder.
 * Returns null if the API is unavailable or the address cannot be resolved.
 */
function geocodeViaGoogleMaps(address) {
  return withTimeout(
    new Promise((resolve) => {
      try {
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
      } catch {
        resolve(null);
      }
    }),
    5000 // 5 second timeout per address
  );
}

/**
 * Geocode a single address via OpenStreetMap Nominatim (free, no key).
 */
async function geocodeViaNominatim(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
    const res = await withTimeout(
      fetch(url, { headers: { 'User-Agent': 'FlipIQ-Real-Estate-App/1.0' } }),
      5000
    );
    if (!res || !res.ok) return null;
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
    const data = await withTimeout(
      invokeEdgeFunction('geocode-comps', { addresses }),
      10000 // 10 second timeout for batch
    );
    if (data?.results && Array.isArray(data.results)) {
      return data.results;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Geocode a single address trying Google Maps first, then Nominatim.
 */
async function geocodeSingleAddress(address) {
  const gmResult = await geocodeViaGoogleMaps(address);
  if (gmResult) return gmResult;

  const nomResult = await geocodeViaNominatim(address);
  if (nomResult) return nomResult;

  return null;
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

  // Try edge function first (batch GPT geocoding) with a timeout
  const edgeResults = await geocodeViaEdgeFunction(
    needsGeocode.map((n) => ({ index: n.index, address: n.address }))
  );

  let edgeFunctionWorked = false;
  if (edgeResults) {
    edgeFunctionWorked = true;
    for (const r of edgeResults) {
      if (r.latitude != null && r.longitude != null) {
        geocoded[r.index] = { latitude: r.latitude, longitude: r.longitude };
      }
    }
  }

  // Fall back to Google Maps / Nominatim for any not resolved
  const stillNeed = needsGeocode.filter((n) => !geocoded[n.index]);

  if (stillNeed.length > 0) {
    let done = Object.keys(geocoded).length;
    const total = needsGeocode.length;

    for (let i = 0; i < stillNeed.length; i++) {
      const { index, address } = stillNeed[i];
      const result = await geocodeSingleAddress(address);
      if (result) {
        geocoded[index] = result;
      }
      done++;
      if (onProgress) onProgress({ done, total });
      if (i < stillNeed.length - 1) await sleep(350);
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
