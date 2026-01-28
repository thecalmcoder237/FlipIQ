import { apiService } from './apiService';

export const propertyDetailsService = {
  async getPropertyDetails(address, zipCode) {
    try {
      // Simulate API call
      // const url = `https://api.bridgedataoutput.com/api/v2/pub/parcels?address=${address}`;
      // const data = await apiService.get(url);
      
      throw new Error("Property API credentials missing");
    } catch (error) {
      return this.getMockPropertyDetails();
    }
  },

  getMockPropertyDetails() {
    return {
      yearBuilt: Math.floor(Math.random() * (2020 - 1950) + 1950),
      lotSize: Math.floor(Math.random() * (10000 - 3000) + 3000),
      hoaFees: Math.random() > 0.5 ? Math.floor(Math.random() * 300) : 0,
      propertyType: 'Single Family',
      taxAssessment: 250000,
      schoolRating: Math.floor(Math.random() * 10) + 1,
      crimeScore: 'Low',
      source: 'Mock Data',
      freshness: new Date().toISOString()
    };
  }
};