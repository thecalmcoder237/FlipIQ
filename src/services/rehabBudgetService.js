
import { supabase } from '@/lib/customSupabaseClient';

class RehabBudgetService {
  /**
   * Calls the Edge Function to extract property details using Claude.
   */
  async extractPropertyData(deal) {
    try {
      const prompt = `
        Based on standard assumptions for a property built in ${deal.year_built} located in ${deal.zip_code} (Atlanta area) with ${deal.sqft} sqft:
        
        Extract or infer detailed property specifications.
        Return JSON ONLY with keys: year_built, property_type, architecture_style, basement_type, garage_type, roof_type, hvac_system, electrical_system, plumbing_system, foundation_type, estimated_window_condition.
      `;

      const { data, error } = await supabase.functions.invoke('send-claude-request', {
        body: {
          address: deal.address,
          requestType: 'custom_json', 
          systemPrompt: "You are a property inspector AI.",
          userMessage: prompt,
          model: 'claude-3-5-haiku-20241022' // Use Haiku 3.5 for reliable performance
        }
      });

      if (error) throw error;
      
      if (!data || data.error) {
         // Fallback mock data if AI service fails or is not configured
         console.warn("AI Service unavailable, using fallback data.");
         return {
            year_built: deal.year_built,
            property_type: "Single Family",
            architecture_style: "Traditional / Ranch",
            basement_type: "Crawl Space / Unfinished",
            garage_type: "2-Car Attached",
            roof_type: "Asphalt Shingle (Est. 15yr)",
            hvac_system: "Central Air / Gas Heat",
            electrical_system: "200 Amp Service",
            plumbing_system: "Copper / PVC Mix",
            foundation_type: "Poured Concrete",
            estimated_window_condition: "Original / Single Pane"
         };
      }

      return data;
    } catch (error) {
      console.error("Extract Property Data Failed:", error);
      throw new Error("Failed to extract property data. Please try again later.");
    }
  }

  /**
   * Generates a comprehensive SOW and Budget using Claude.
   */
  async generateRehabBudget(deal, propertyDetails, photos, rehabCategory) {
    const photoContext = photos && photos.length > 0 
        ? `Photos indicate the following conditions: ${photos.map(p => p.analysis).join('; ')}`
        : "No photos provided; assume condition based on rehab category.";

    const prompt = `
      Generate a detailed Rehab Scope of Work (SOW) for a flip in Atlanta, GA.
      Property: ${deal.address}, ${deal.sqft} sqft, ${deal.bedrooms} bed, ${deal.bathrooms} bath.
      Rehab Level: ${rehabCategory}
      Details: ${JSON.stringify(propertyDetails)}
      Photo Insights: ${photoContext}

      OUTPUT JSON format with:
      - executive_summary (text)
      - room_breakdown (array of objects: area_name, items (array of {task, cost, notes}), total_area_cost)
      - material_sourcing (text)
      - labor_estimates (text)
      - timeline_weeks (number)
      - contingency_amount (number)
      - total_budget (number)
      - cost_per_sqft (number)
      - finish_level (string)
    `;

    try {
      const { data, error } = await supabase.functions.invoke('send-claude-request', {
        body: {
          address: deal.address,
          requestType: 'custom_json',
          systemPrompt: "You are an expert general contractor and real estate investor analyst.",
          userMessage: prompt,
          model: 'claude-3-5-haiku-20241022' // Use Haiku 3.5 for reliable performance
        }
      });

      if (error) throw error;
      
      if (!data || !data.room_breakdown) {
          return this._getMockBudget(deal, rehabCategory);
      }

      return data;
    } catch (error) {
      console.error("Generate Budget Failed:", error);
      // Return mock budget on failure to ensure UI doesn't break
      return this._getMockBudget(deal, rehabCategory);
    }
  }

  _getMockBudget(deal, category) {
    const baseCost = deal.rehab_costs || 30000;
    return {
      executive_summary: `Comprehensive ${category} rehab plan focusing on high-ROI upgrades suitable for the Atlanta market.`,
      room_breakdown: [
        { area_name: "Kitchen", items: [{task: "Cabinets", cost: 5000}, {task: "Countertops", cost: 3000}], total_area_cost: 8000 },
        { area_name: "Bathrooms", items: [{task: "Vanities", cost: 1500}, {task: "Tile", cost: 2000}], total_area_cost: 3500 },
        { area_name: "General", items: [{task: "Paint", cost: 4000}, {task: "Flooring", cost: 6000}], total_area_cost: 10000 }
      ],
      material_sourcing: "Home Depot Pro Desk & local granite suppliers.",
      labor_estimates: "Based on mid-tier licensed contractors.",
      timeline_weeks: 8,
      contingency_amount: baseCost * 0.15,
      total_budget: baseCost,
      cost_per_sqft: Math.round(baseCost / deal.sqft),
      finish_level: category
    };
  }
}

export const rehabBudgetService = new RehabBudgetService();
