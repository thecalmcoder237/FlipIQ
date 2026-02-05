import { supabase } from '@/lib/customSupabaseClient';

/**
 * Fetches all profiles for the "All deals" user selector in Deal History.
 * Requires RLS policy allowing authenticated users to read profiles.
 * @returns {Promise<Array<{ id: string, email: string, displayName: string }>>}
 */
export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .order('email', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    email: row.email || '',
    displayName: row.display_name || row.email || 'Unknown',
  }));
}
