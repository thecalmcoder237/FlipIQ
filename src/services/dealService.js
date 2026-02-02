
import { supabase } from '@/lib/customSupabaseClient';
import { inputsToDatabase, databaseToInputs } from '@/utils/databaseMapping';

/** Normalize address for duplicate comparison: lowercase, collapse spaces, remove commas. */
export function normalizeAddressForComparison(address) {
  if (!address || typeof address !== 'string') return '';
  return address
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const dealService = {
  /**
   * Saves a deal to the database (insert or update).
   * Automatically handles mapping and timestamp updates.
   * @param {Object} inputs - The camelCase input data from the application.
   * @param {string} userId - The current user's ID.
   * @returns {Promise<Object>} The saved deal data in camelCase format.
   */
  async saveDeal(inputs, userId) {
    if (!userId) throw new Error("User ID is required to save a deal.");

    const doUpsert = (includeFundingContactStatus = true) => {
      const payload = inputsToDatabase(inputs, { includeFundingContactStatus });
      payload.user_id = userId;
      payload.updated_at = new Date().toISOString();
      if (!inputs.id) {
        payload.created_at = new Date().toISOString();
      } else {
        payload.id = inputs.id;
      }
      return supabase.from('deals').upsert(payload).select().single();
    };

    try {
      // Omit funding/contact/status columns until migration 20260131120000_deals_funding_contact_status.sql is applied
      const { data, error } = await doUpsert(false);
      if (error) throw error;
      return databaseToInputs(data);
    } catch (error) {
      console.error("dealService.saveDeal Error:", error);
      throw error;
    }
  },

  /**
   * Loads a single deal by ID.
   * Fetches associated scenarios via join.
   * @param {string} dealId - The deal UUID.
   * @param {string} userId - The current user's ID (for security verification).
   * @returns {Promise<Object>} The loaded deal in camelCase format.
   */
  async loadDeal(dealId, userId) {
    if (!dealId) throw new Error("Deal ID is required.");
    
    try {
      // We join scenarios table to get the list of scenarios for this deal.
      // Use maybeSingle() so missing deal returns null instead of PGRST116/406.
      const { data, error } = await supabase
        .from('deals')
        .select('*, scenarios:scenarios!deal_id(*)')
        .eq('id', dealId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Security: Enforce ownership check
      if (userId && data.user_id !== userId) {
          throw new Error("Access denied: You do not have permission to access this deal.");
      }

      return databaseToInputs(data);
    } catch (error) {
      console.error("dealService.loadDeal Error:", error);
      throw error;
    }
  },

  /**
   * Loads all deals for the authenticated user.
   * @param {string} userId - The current user's ID.
   * @returns {Promise<Array>} Array of deals in camelCase format.
   */
  async loadUserDeals(userId) {
     if (!userId) throw new Error("User ID is required.");

     try {
        const { data, error } = await supabase
           .from('deals')
           .select('*') // Usually don't need full scenario history for list view
           .eq('user_id', userId) // Security: Filter by user_id to prevent data leakage
           .order('updated_at', { ascending: false });
        
        if (error) throw error;
        return data.map(databaseToInputs);
     } catch (error) {
        console.error("dealService.loadUserDeals Error:", error);
        throw error;
     }
  },

  /**
   * Find an existing deal for this user that matches the given address (normalized comparison).
   * Used to avoid duplicate entries and offer "Load existing analysis".
   * @param {string} userId
   * @param {string} address - Canonical address (e.g. from geocode formatted_address)
   * @param {string} [excludeDealId] - Ignore this deal ID (e.g. when editing)
   * @returns {Promise<Object|null>} Matching deal in camelCase or null
   */
  async findDealByAddress(userId, address, excludeDealId) {
    if (!userId) throw new Error('User ID is required.');
    const normalized = normalizeAddressForComparison(address);
    if (!normalized) return null;

    try {
      const deals = await this.loadUserDeals(userId);
      const match = deals.find((d) => {
        if (excludeDealId && d.id === excludeDealId) return false;
        return normalizeAddressForComparison(d.address) === normalized;
      });
      return match || null;
    } catch (error) {
      console.error('dealService.findDealByAddress Error:', error);
      return null;
    }
  },

  /**
   * Deletes a deal by ID.
   * @param {string} dealId 
   * @param {string} userId 
   * @returns {Promise<boolean>} True if successful.
   */
  async deleteDeal(dealId, userId) {
    if (!dealId) throw new Error("Deal ID is required.");
    if (!userId) throw new Error("User ID is required for security verification.");

    try {
      // Security: First verify ownership before deleting
      const { data: deal, error: fetchError } = await supabase
        .from('deals')
        .select('user_id')
        .eq('id', dealId)
        .single();

      if (fetchError) throw fetchError;
      if (!deal) throw new Error("Deal not found.");
      if (deal.user_id !== userId) {
        throw new Error("Access denied: You do not have permission to delete this deal.");
      }

      // Now safe to delete
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)
        .eq('user_id', userId); // Double-check with user_id filter

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("dealService.deleteDeal Error:", error);
      throw error;
    }
  }
};
