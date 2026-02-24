import { useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES = ['places', 'geometry', 'marker'];

const RAW_MAP_ID = String(import.meta.env.VITE_GOOGLE_MAP_ID ?? '').trim();
const INVALID_MAP_IDS = ['', 'undefined', 'null', 'DEMO_MAP_ID'];
const HAS_MAP_ID = RAW_MAP_ID.length > 0 && !INVALID_MAP_IDS.includes(RAW_MAP_ID);
const MAP_ID = HAS_MAP_ID ? RAW_MAP_ID : undefined;

export function useGoogleMaps() {
  return useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });
}

export { MAP_ID, HAS_MAP_ID };
