import { apiService } from './apiService';
import { fetchMockComps } from '@/utils/mockComps';

const ZILLOW_API_BASE = 'https://api.bridgedataoutput.com/api/v2/zestimates'; // Example endpoint, replace with real one if available
// Note: Real Zillow API access often requires a server-side proxy due to CORS. 
// For this demo, we will structure it to call a real URL but fallback gracefully.

export const compsService = {
  async fetchComps(address, zipCode) {
    const apiKey = import.meta.env.VITE_ZILLOW_API_KEY;

    if (!apiKey) {
      console.warn('Zillow API Key not found. Using mock data.');
      return this.fetchMockComps(address, zipCode);
    }

    try {
      // In a real scenario, you'd construct the Zillow/Bridge API URL here
      // const url = `${ZILLOW_API_BASE}?address=${encodeURIComponent(address)}&access_token=${apiKey}`;
      // const response = await apiService.get(url);
      
      // For demonstration of "Real API" integration logic without a paid key:
      // We simulate an API call structure
      throw new Error("Zillow API integration requires valid credentials."); 

      // return this.transformZillowData(response);

    } catch (error) {
      console.error('Comps API failed, falling back to mock data:', error);
      return this.fetchMockComps(address, zipCode);
    }
  },

  async fetchMockComps(address, zipCode) {
    const data = await fetchMockComps(address, zipCode, 300000); // Pass a dummy ARV for mock generation
    return data.map(comp => ({
      ...comp,
      source: 'Mock Data',
      freshness: new Date().toISOString(),
      confidence: 0.7
    }));
  },

  transformZillowData(data) {
    // Map API specific response to our app's format
    return data.bundle.map(item => ({
      address: item.address,
      price: item.zestimate,
      beds: item.bedrooms,
      baths: item.bathrooms,
      sqft: item.finishedSqFt,
      source: 'Zillow API',
      freshness: new Date().toISOString(),
      confidence: 0.95
    }));
  }
};