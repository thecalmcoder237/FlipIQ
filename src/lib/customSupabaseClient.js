import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shhwgkabmhnjwkgztzre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoaHdna2FibWhuandrZ3p0enJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDg4MzcsImV4cCI6MjA3NTA4NDgzN30.tL9BrWDfwm8gppOxSRF-Nl8C_-e6LwF4Ojs06SEDPAM';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
