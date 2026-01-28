
import { supabase } from '@/lib/customSupabaseClient';

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

class ClaudeCompsService {
  constructor() {
    this.cache = new Map();
  }

  _getCacheKey(address) {
    return `claude_comps_${address.replace(/\s+/g, '_').toLowerCase()}`;
  }

  /**
   * Calls the Supabase Edge Function 'send-claude-request' to analyze comps securely.
   * Ensures only real data is returned (no mocks).
   */
  async analyzePropertyComps(address, zipCode, bedrooms, bathrooms, sqft) {
    const cacheKey = this._getCacheKey(address);
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('Serving Claude comps from cache');
      return cached.data;
    }

    try {
      console.log('Invoking secure Edge Function for Claude analysis...');
      
      const { data, error } = await supabase.functions.invoke('send-claude-request', {
        body: { 
          address, 
          requestType: 'analyzePropertyComps',
          additionalParams: { zipCode, bedrooms, bathrooms, sqft }
        }
      });

      if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
      }
      
      if (data && data.error) {
        throw new Error(data.error);
      }
      
      // Ensure we have a valid structure even if AI returns partial
      const result = {
        comps: Array.isArray(data?.comps) ? data.comps : [],
        marketAnalysis: data?.marketAnalysis || "Market analysis currently unavailable.",
        arvEstimate: data?.arvEstimate || "Pending",
        confidenceScore: data?.confidenceScore || 0,
        source: 'Claude AI (Real-Time)',
        timestamp: new Date().toISOString()
      };

      // Sort comps by sale date descending (most recent first)
      if (result.comps.length > 0) {
        result.comps.sort((a, b) => {
           const dateA = new Date(a.soldDate || a.saleDate || 0);
           const dateB = new Date(b.soldDate || b.saleDate || 0);
           return dateB - dateA;
        });
        
        // Filter for last 1 year (approx)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        result.comps = result.comps.filter(c => {
           const d = new Date(c.soldDate || c.saleDate);
           return d > oneYearAgo;
        });
      }

      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;

    } catch (error) {
      console.error("Claude Service Failed (Edge Function):", error);
      throw error; // Propagate error instead of mocking
    }
  }

  clearCache(address) {
     const cacheKey = this._getCacheKey(address);
     this.cache.delete(cacheKey);
  }
}

export const claudeCompsService = new ClaudeCompsService();
