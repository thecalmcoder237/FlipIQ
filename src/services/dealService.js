
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

    try {
      const payload = inputsToDatabase(inputs);
      payload.updated_at = new Date().toISOString();

      if (!inputs.id) {
        // ── INSERT new deal ──────────────────────────────────────────────────
        // Set ownership only on creation. RLS WITH CHECK: auth.uid() = user_id.
        payload.user_id = userId;
        payload.created_at = new Date().toISOString();
        const { data, error } = await supabase
          .from('deals')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return databaseToInputs(data);
      } else {
        // ── UPDATE existing deal ─────────────────────────────────────────────
        // First try a direct RLS-checked update (fast path for properly-owned deals).
        // If 0 rows are returned (PGRST116) the deal's user_id in the DB is stale
        // or null — fall back to the admin edge function which handles this case.
        delete payload.id; // never send id in the update SET clause
        const { data: directData, error: directError } = await supabase
          .from('deals')
          .update(payload)
          .eq('id', inputs.id)
          .eq('user_id', userId)
          .select()
          .maybeSingle(); // maybeSingle won't throw PGRST116 for 0 rows

        if (directError) throw directError;

        if (directData) {
          return databaseToInputs(directData);
        }

        // Fast path returned no rows — use admin edge function (handles stale user_id).
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('update-deal', {
          body: { dealId: inputs.id, ...payload },
        });
        if (edgeError) throw new Error(`Update failed: ${edgeError.message}`);
        if (edgeData?.error) throw new Error(edgeData.error);
        // Edge function returns the full snake_case row; reload to get full camelCase state.
        const reloaded = await dealService.loadDeal(inputs.id, userId);
        if (!reloaded) throw new Error('Update failed: deal not found after save.');
        return reloaded;
      }
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

      // RLS controls visibility. For "All deals" view, users may view (read-only) other users' deals.
      return databaseToInputs(data);
    } catch (error) {
      console.error("dealService.loadDeal Error:", error);
      // Map "Failed to fetch" to a user-friendly message for network/connectivity issues
      const isNetworkError = error?.message === 'Failed to fetch' || error?.name === 'TypeError';
      if (isNetworkError) {
        throw new Error(
          "Unable to connect. Check your internet connection, disable ad blockers for this site, " +
          "and ensure Supabase is reachable. If the issue persists, your Supabase project may be paused."
        );
      }
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
           .select('*')
           .eq('user_id', userId)
           .order('updated_at', { ascending: false });
        
        if (error) throw error;
        return data.map(databaseToInputs);
     } catch (error) {
        console.error("dealService.loadUserDeals Error:", error);
        throw error;
     }
  },

  /**
   * Loads all deals (all users). Used for Deal History "All deals" view.
   * Requires RLS policy allowing authenticated users to SELECT all deals.
   * @returns {Promise<Array>} Array of deals in camelCase format.
   */
  async loadAllDeals() {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(databaseToInputs);
    } catch (error) {
      console.error("dealService.loadAllDeals Error:", error);
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
   * Updates specific small fields on a deal (status, isFavorite, isClosed, isFunded, etc.)
   * via the admin-client edge function so that deals with a stale/null user_id
   * (created before ownership tracking) still work correctly.
   *
   * @param {string} dealId - The deal UUID.
   * @param {Object} fields - camelCase fields to update (e.g. { status: 'Completed' }).
   * @returns {Promise<Object>} The updated deal in camelCase format (reloaded from DB).
   */
  async updateDealFields(dealId, fields, userId) {
    if (!dealId) throw new Error('Deal ID is required.');

    // Map camelCase fields to snake_case for the edge function payload.
    const snakeFields = {};
    if ('status' in fields) snakeFields.status = fields.status;
    if ('isFavorite' in fields) snakeFields.is_favorite = fields.isFavorite;
    if ('isClosed' in fields) snakeFields.is_closed = fields.isClosed;
    if ('isFunded' in fields) snakeFields.is_funded = fields.isFunded;
    if ('fundedTerms' in fields) snakeFields.funded_terms = fields.fundedTerms;

    const { data, error } = await supabase.functions.invoke('update-deal', {
      body: { dealId, ...snakeFields },
    });

    if (error) throw new Error(`Update failed: ${error.message}`);
    if (data?.error) throw new Error(data.error);

    // Reload the full deal to get all camelCase fields.
    const reloaded = await dealService.loadDeal(dealId, userId);
    if (!reloaded) throw new Error('Update failed: deal not found after save.');
    return reloaded;
  },

  /**
   * Generates and saves a share token for a deal. Only the owner can update.
   * @param {string} dealId - The deal UUID.
   * @param {string} userId - The current user's ID (must own the deal).
   * @returns {Promise<{ shareToken: string }>} The new share token.
   */
  async updateShareToken(dealId, userId) {
    if (!dealId) throw new Error("Deal ID is required.");
    if (!userId) throw new Error("User ID is required.");

    // Uses edge function with admin client to bypass RLS (avoids silent failures
    // when user_id in DB is stale or mismatched with current auth session).
    const { data, error } = await supabase.functions.invoke('update-share-token', {
      body: { dealId },
    });

    if (error) throw new Error(`Share token error: ${error.message}`);
    if (!data?.shareToken) throw new Error(data?.error || 'Failed to save share token.');
    return { shareToken: data.shareToken };
  },

  /**
   * Loads a deal by share token (public, no auth required).
   * Uses edge function to bypass RLS.
   * @param {string} token - The share token from the deal.
   * @returns {Promise<Object|null>} The deal in camelCase format, or null if not found.
   */
  async loadSharedDeal(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      const { data, error } = await supabase.functions.invoke('get-shared-deal', {
        body: { token: token.trim() },
      });

      if (error) return null;
      const res = data;
      if (!res?.deal || res?.error) return null;
      return databaseToInputs(res.deal);
    } catch (err) {
      console.error('dealService.loadSharedDeal Error:', err);
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
