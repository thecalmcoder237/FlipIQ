/**
 * Geocode comp addresses that are missing latitude/longitude.
 *
 * Strategy:
 *   1. Try the `geocode-comps` Supabase Edge Function (GPT-powered, batch).
 *   2. Fall back to Google Maps Places API (findPlaceFromQuery).
 *   3. Fall back to Google Maps Geocoder.
 *
 * Always returns partial results — never throws. If 4/5 addresses succeed,
 * those 4 will have coordinates and the map can render with them.
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
          { query: address, fields: ['geometry'] },
          (results, status) => {
            try {
              if (
                status === window.google.maps.places.PlacesServiceStatus.OK &&
                results?.length > 0 &&
                results[0].geometry?.location
              ) {
                const loc = results[0].geometry.location;
                resolve({ latitude: loc.lat(), longitude: loc.lng() });
              } else {
                resolve(null);
              }
            } catch { resolve(null); }
          }
        );
      } catch { resolve(null); }
    }),
    8000
  );
}

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
          try {
            if (status === 'OK' && results?.length > 0) {
              const loc = results[0].geometry.location;
              resolve({ latitude: loc.lat(), longitude: loc.lng() });
            } else {
              resolve(null);
            }
          } catch { resolve(null); }
        });
      } catch { resolve(null); }
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
    if (data?.results && Array.isArray(data.results)) return data.results;
    return null;
  } catch { return null; }
}

async function geocodeSingleAddress(address) {
  try {
    const placesResult = await geocodeViaPlacesAPI(address);
    if (placesResult) return placesResult;
  } catch { /* continue to next strategy */ }

  try {
    const geocoderResult = await geocodeViaGeocoder(address);
    if (geocoderResult) return geocoderResult;
  } catch { /* give up on this address */ }

  return null;
}

/**
 * @param {Array} comps
 * @param {(progress: {done: number, total: number}) => void} [onProgress]
 * @returns {Promise<Array>} – NEVER throws; always returns comps (some may
 *   now have latitude/longitude filled in)
 */
export async function geocodeComps(comps, onProgress) {
  if (!Array.isArray(comps) || comps.length === 0) return comps;

  const geocoded = {};

  const needsGeocode = [];
  comps.forEach((comp, i) => {
    if (!hasCoords(comp) && comp.address) {
      needsGeocode.push({ index: i, address: comp.address });
    }
  });

  if (needsGeocode.length === 0) return comps;

  const buildResult = () =>
    comps.map((comp, i) => (geocoded[i] ? { ...comp, ...geocoded[i] } : comp));

  // 1. Edge function (batch GPT)
  try {
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
  } catch { /* edge function failed, continue to client-side fallback */ }

  // 2. Client-side fallback for anything not yet resolved
  const stillNeed = needsGeocode.filter((n) => !geocoded[n.index]);

  if (stillNeed.length > 0) {
    let done = Object.keys(geocoded).length;
    const total = needsGeocode.length;

    for (let i = 0; i < stillNeed.length; i++) {
      try {
        const { index, address } = stillNeed[i];
        const result = await geocodeSingleAddress(address);
        if (result) geocoded[index] = result;
      } catch { /* skip this address */ }

      done++;
      try { if (onProgress) onProgress({ done, total }); } catch { /* */ }

      if (i < stillNeed.length - 1) {
        try { await sleep(400); } catch { /* */ }
      }
    }
  }

  return buildResult();
}

export default geocodeComps;
