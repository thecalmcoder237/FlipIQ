
# Configuration Setup Guide

## Setting Up Claude API Key Securely

This project uses **Supabase Edge Functions** to securely communicate with the Anthropic (Claude) API. This ensures your API keys are never exposed in the frontend code or browser.

### 1. Prerequisite: Get an API Key
- Go to [Anthropic Console](https://console.anthropic.com/)
- Sign up or log in
- Generate a new API Key (starts with `sk-ant-...`)

### 2. Configure Supabase Secret
You must store this key as a **Secret** in your Supabase project.

1.  Open your **Supabase Dashboard**.
2.  Navigate to **Settings** (cog icon) -> **Edge Functions**.
3.  Add a new secret:
    *   **Name:** `CLAUDE_API_KEY`
    *   **Value:** `sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx` (Paste your actual key)

Alternatively, if you are using the Horizons editor, you can ask the assistant to set this secret for you by providing the key in a prompt (Note: Be careful sharing real keys in chat interfaces).

### 3. Testing the Integration
1.  Start the application (`npm run dev`).
2.  Navigate to a Deal Analysis page.
3.  Click on the **"Claude AI"** tab.
4.  Click **"Ask Claude to Analyze"**.
5.  If successful, you will see specific market data and comparables loaded.
    *   *Note: If the key is missing or invalid, the app will gracefully fallback to mock data and log an error in the browser console.*

### 4. Troubleshooting
*   **"Edge Function Error" in Console:** Check that the `CLAUDE_API_KEY` secret is set correctly in Supabase.
*   **429 Rate Limit:** The function allows 10 requests per minute per IP. Wait a moment and try again.
*   **Mock Data Showing:** This means the API call failed. Check the browser console (F12) for specific error messages like "Missing CLAUDE_API_KEY".

### ⚠️ Security Warning
*   **NEVER** commit your `sk-ant-...` key to Git or any version control.
*   **NEVER** paste the key into `src/config/claudeConfig.js` or `.env` files meant for the frontend.
*   **ALWAYS** use Supabase Secrets for backend keys.
