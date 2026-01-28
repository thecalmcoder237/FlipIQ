
import { supabase } from '@/lib/customSupabaseClient';

export const projectionService = {
  // --- Hidden Costs ---
  async getHiddenCosts(dealId) {
    const { data, error } = await supabase
      .from('hidden_costs')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async saveHiddenCost(cost) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare payload
    const payload = {
      ...cost,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (!payload.id) {
       delete payload.id; // Let DB generate ID for inserts
    }

    const { data, error } = await supabase
      .from('hidden_costs')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteHiddenCost(costId) {
    const { error } = await supabase
      .from('hidden_costs')
      .delete()
      .eq('id', costId);

    if (error) throw error;
    return true;
  },

  // --- Scenarios ---
  async getScenarios(dealId) {
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async saveScenario(scenario) {
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      ...scenario,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };
    
    if (!payload.id) delete payload.id;

    const { data, error } = await supabase
      .from('scenarios')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteScenario(scenarioId) {
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', scenarioId);

    if (error) throw error;
    return true;
  }
};
