
import { apiService } from './apiService';

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
