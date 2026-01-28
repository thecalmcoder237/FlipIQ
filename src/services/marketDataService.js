import { apiService } from './apiService';
import { atlantaMarketData } from '@/constants/atlantaMarketData';

export const marketDataService = {
  async getMarketData(zipCode) {
    // Primary: Try Zillow/Real API
    try {
       // const url = `https://api.example.com/market-metrics?zip=${zipCode}`;
       // const data = await apiService.get(url);
       // return this.transformMarketData(data);
       
       // Throw to trigger fallback for demo
       throw new Error("Market Data API key missing");
    } catch (error) {
       console.warn(`Market API failed for ${zipCode}, using fallback/mock data.`);
       return this.getFallbackData(zipCode);
    }
  },

  getFallbackData(zipCode) {
    // Use our local constants file as the first layer of fallback
    const localData = atlantaMarketData[zipCode];
    
    if (localData) {
      return {
        marketAppreciation: localData.appreciation_trend,
        avgDaysOnMarket: localData.days_on_market_avg,
        pricePerSqft: localData.price_per_sqft,
        inventoryLevel: 'Low', // Mock
        marketHotness: localData.market_hotness,
        source: 'Local Database',
        freshness: new Date().toISOString(),
        confidence: 0.85
      };
    }

    // Generic fallback if ZIP not in our small database
    return {
      marketAppreciation: 3.5,
      avgDaysOnMarket: 45,
      pricePerSqft: 250,
      inventoryLevel: 'Medium',
      marketHotness: 5,
      source: 'National Averages (Mock)',
      freshness: new Date().toISOString(),
      confidence: 0.5
    };
  }
};