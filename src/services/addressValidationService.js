
import { apiService } from './apiService';

/**
 * Extract 5-digit postal code from Google Geocode address_components (legacy).
 * @param {Array<{ long_name: string, short_name: string, types: string[] }>} components
 * @returns {string|null} 5-digit ZIP or null
 */
export function getPostalCodeFromComponents(components) {
  if (!Array.isArray(components)) return null;
  const postal = components.find((c) => c.types && c.types.includes('postal_code'));
  if (!postal || !postal.long_name) return null;
  const digits = postal.long_name.replace(/\D/g, '').slice(0, 5);
  return digits.length === 5 ? digits : null;
}

/**
 * Extract 5-digit postal code from Place API addressComponents (new: longText/shortText).
 * @param {Array<{ longText?: string | { text?: string }, shortText?: string, types?: string[] } | { long_name: string }>} components
 * @returns {string|null} 5-digit ZIP or null
 */
export function getPostalCodeFromPlaceAddressComponents(components) {
  if (!Array.isArray(components)) return null;
  const postal = components.find((c) => c.types && c.types.includes('postal_code'));
  if (!postal) return null;
  let raw = '';
  if (postal.longText !== undefined) {
    raw = typeof postal.longText === 'string' ? postal.longText : (postal.longText?.text ?? '');
  } else if (postal.long_name) {
    raw = postal.long_name;
  }
  const digits = String(raw).replace(/\D/g, '').slice(0, 5);
  return digits.length === 5 ? digits : null;
}

/**
 * Extract city and county from Google Geocode address_components (legacy).
 * @param {Array<{ long_name: string, short_name: string, types: string[] }>} components
 * @returns {{ city?: string, county?: string }}
 */
export function getCityAndCountyFromComponents(components) {
  if (!Array.isArray(components)) return {};
  const locality = components.find((c) => c.types && c.types.includes('locality'));
  const county = components.find((c) => c.types && c.types.includes('administrative_area_level_2'));
  return {
    city: locality?.long_name?.trim() || undefined,
    county: county?.long_name?.trim() || undefined,
  };
}

export const addressValidationService = {
  async validateAndGeocode(address) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API Key missing. Returning mock validation.");
      return {
        isValid: true,
        formattedAddress: address, // Just return what was typed
        location: { lat: 33.7490, lng: -84.3880 }, // Atlanta center
        source: 'Mock Validation'
      };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const data = await apiService.get(url);

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          isValid: true,
          formattedAddress: result.formatted_address,
          location: result.geometry.location,
          components: result.address_components,
          source: 'Google Maps API'
        };
      } else {
        return {
          isValid: false,
          error: 'Address not found'
        };
      }
    } catch (error) {
      console.error("Address validation error:", error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }
};
