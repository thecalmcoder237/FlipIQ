/** Type declarations for npm:@supabase/supabase-js@2 (resolved at runtime by Supabase Edge / Deno) */
declare module "npm:@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: { auth?: { persistSession?: boolean } }
  ): any;
}
