import { useState, useEffect } from 'react';

const CALLBACK_NAME = 'flipiqGooglePlacesCallback';

/** Set once we inject the script; never remove so we never double-include (e.g. under React Strict Mode). */
let scriptInjected = false;

/**
 * Loads the Google Maps JavaScript API and the new Places library (PlaceAutocompleteElement).
 * Injects the script at most once per page; cleanup does not remove it to avoid "included multiple times".
 * @returns {{ isReady: boolean, error: string | null }}
 */
export function useGooglePlacesScript() {
  const [state, setState] = useState({ isReady: false, error: null });

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setState({ isReady: false, error: 'Google Maps API key not set' });
      return;
    }
    if (typeof window !== 'undefined' && typeof window.google?.maps?.places?.PlaceAutocompleteElement !== 'undefined') {
      setState({ isReady: true, error: null });
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing || scriptInjected) {
      const check = () => {
        if (typeof window.google?.maps?.places?.PlaceAutocompleteElement !== 'undefined') setState({ isReady: true, error: null });
        else if (window.google?.maps?.importLibrary) {
          window.google.maps.importLibrary('places').then(() => setState({ isReady: true, error: null })).catch((err) => setState({ isReady: false, error: err?.message || 'Places library failed' }));
        } else setTimeout(check, 100);
      };
      check();
      return;
    }
    scriptInjected = true;
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    let callbackFired = false;
    window[CALLBACK_NAME] = () => {
      callbackFired = true;
      if (typeof window.google?.maps?.importLibrary !== 'function') {
        setState({ isReady: false, error: 'Google Maps bootstrap failed' });
        return;
      }
      window.google.maps.importLibrary('places')
        .then(() => setState({ isReady: true, error: null }))
        .catch((err) => setState({ isReady: false, error: err?.message || 'Places library failed' }));
    };
    script.onerror = () => setState({ isReady: false, error: 'Failed to load Google Maps' });
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${CALLBACK_NAME}`;
    document.head.appendChild(script);
    const timeoutMs = 10000;
    const timeoutId = setTimeout(() => {
      if (callbackFired) return;
      setState({
        isReady: false,
        error: 'Google Maps did not load. Add http://localhost:3000/* to your API key’s HTTP referrers in Google Cloud Console and disable ad blockers for this site.'
      });
    }, timeoutMs);
    return () => {
      clearTimeout(timeoutId);
      // Do not remove script or delete callback: avoids "included multiple times" when effect re-runs (e.g. Strict Mode).
    };
  }, []);

  return state;
}
