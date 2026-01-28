
/**
 * Claude AI Configuration
 * 
 * IMPORTANT: This file is for structure and documentation only.
 * 
 * SECURITY NOTICE:
 * The actual Claude API Key (CLAUDE_API_KEY) must NEVER be stored in this file
 * or anywhere in the frontend code. Doing so would expose your key to the public.
 * 
 * Instead, the API Key is managed securely on the server-side via Supabase Edge Functions
 * and Environment Secrets.
 * 
 * Key Format:
 * The key typically starts with "sk-ant-..."
 * 
 * Configuration:
 * - The Edge Function 'send-claude-request' handles all communication with Anthropic.
 * - This frontend simply invokes that function.
 */

export const claudeConfig = {
  // Model version to request from the backend
  defaultModel: "claude-3-5-haiku-20241022",
  
  // Timeout for requests (in milliseconds)
  timeout: 30000,

  // Maximum retries for failed requests
  maxRetries: 2
};
