/**
 * Geocode comp addresses that are missing latitude/longitude.
 *
 * Strategy:
 *   1. Try the `geocode-comps` Supabase Edge Function (GPT-powered, batch)
 *      with a 10 s timeout so the UI never hangs.
 *   2. Fall back to the Google Maps Places API (findPlaceFromQuery) which is
 *      already loaded via @react-google-maps/api with the 'places' library.
 *   3. If Places also fails, try the Geocoder service.
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
 * Geocode via Google Maps Places API findPlaceFromQuery.
 * Uses the already-loaded 'places' library.
 */
function geocodeViaPlacesAPI(address) {
  return withTimeout(
    new Promise((resolve) => {
      try {
        if (!window.google?.maps?.places?.PlacesService) {
          resolve(null);
          return;
        }
        const div = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(div);
        service.findPlaceFromQuery(
          {
            query: address,
            fields: ['geometry'],
          },
          (results, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results &&
              results.length > 0 &&
              results[0].geometry?.location
            ) {
              const loc = results[0].geometry.location;
              resolve({ latitude: loc.lat(), longitude: loc.lng() });
            } else {
              resolve(null);
            }
          }
        );
      } catch {
        resolve(null);
      }
    }),
    6000
  );
}

/**
 * Geocode via Google Maps Geocoder (fallback if Places fails).
 */
function geocodeViaGeocoder(address) {
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
    5000
  );
}

async function geocodeViaEdgeFunction(addresses) {
  try {
    const data = await withTimeout(
      invokeEdgeFunction('geocode-comps', { addresses }),
      10000
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
 * Geocode a single address using available strategies.
 */
async function geocodeSingleAddress(address) {
  const placesResult = await geocodeViaPlacesAPI(address);
  if (placesResult) return placesResult;

  const geocoderResult = await geocodeViaGeocoder(address);
  if (geocoderResult) return geocoderResult;

  return null;
}

/**
 * @param {Array} comps – array of comp objects
 * @param {(progress: {done: number, total: number}) => void} [onProgress]
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

  // Try edge function first (batch GPT geocoding) with timeout
  const edgeResults = await geocodeViaEdgeFunction(
    needsGeocode.map((n) => ({ index: n.index, address: n.address }))
  );

  if (edgeResults) {
    for (const r of edgeResults) {
      if (r.latitude != null && r.longitude != null) {
        geocoded[r.index] = { latitude: r.latitude, longitude: r.longitude };
      }
    }
  }

  // Client-side fallback for any addresses not resolved
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

  return comps.map((comp, i) => {
    if (geocoded[i]) {
      return { ...comp, ...geocoded[i] };
    }
    return comp;
  });
}

export default geocodeComps;
