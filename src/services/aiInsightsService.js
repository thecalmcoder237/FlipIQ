
import { supabase } from '@/lib/customSupabaseClient';

export const aiInsightsService = {
  async fetchPropertyIntelligence(deal) {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-property-intelligence', {
        body: {
          address: deal.address,
          zipCode: deal.zip_code,
          propertyType: deal.property_type || 'Single Family',
          arv: deal.arv
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching property intelligence:', error);
      throw error;
    }
  },

  async generateRehabSOW(deal, propertyIntelligence) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-rehab-sow', {
        body: {
          propertyDescription: propertyIntelligence?.propertySpecs || deal.address,
          rehabBudget: deal.rehab_costs || 50000,
          propertyType: deal.property_type || 'Single Family'
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating Rehab SOW:', error);
      throw error;
    }
  }
};
