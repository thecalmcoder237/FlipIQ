# Geocoding Feature CORS Issue - Analysis & Fix

## Issue Summary

The "Geocode & Show Map" feature on the Comps tab fails with CORS (Cross-Origin Resource Sharing) errors when attempting to geocode comparable property addresses. The geocoding process gets stuck at "Geocoding addresses (0/5)..." and never completes.

## Root Cause

The Supabase Edge Function `geocode-comps` returns a **404 status on OPTIONS preflight requests**, causing the browser to block the actual POST request due to CORS policy violations.

### Error Details (from Browser Console)

```
Access to fetch at 'https://ixhxngwbxniggsizire.supabase.co/functions/v1/geocode-comps' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check. 
It does not have HTTP ok status.

net::ERR_FAILED
TypeError: Failed to fetch
[Edge Service] Supabase invocation Error for 'geocode-comps': 
FunctionsFetchError: Failed to send a request to the Edge Function
```

### Network Tab Evidence

- **Request 1**: `geocode-comps` - Type: `fetch`, Status: `CORS error`, Size: `0.0 kB`, Time: `147 ms`
- **Request 2**: `geocode-comps` - Type: `preflight`, Status: `404`, Size: `0.0 kB`, Time: `140 ms`

The 404 on the preflight OPTIONS request is the critical issue.

## Code Analysis

### Local Code is Correct ✅

The edge function at `supabase/functions/geocode-comps/index.ts` **already has proper CORS implementation**:

```typescript
// Lines 4-9: CORS headers defined
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Lines 11-14: OPTIONS request handler
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  return null;
}

// Lines 16-21: JSON response with CORS headers
function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}), ...corsHeaders },
  });
}

// Lines 108-110: CORS handling in main function
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  // ... rest of the handler
});
```

All responses use the `json()` helper which automatically includes CORS headers.

## The Problem: Deployment Gap

**The CORS-fixed code exists locally but has NOT been deployed to the remote Supabase project.**

From `AGENTS.md`:
> "All backend logic lives in 14 Supabase Edge Functions under `supabase/functions/` (Deno/TypeScript). **These are deployed to the remote Supabase project and not run locally.**"

The app connects to: `https://shhwgkabmhnjwkgztzre.supabase.co` (from `src/lib/customSupabaseClient.js`)

When the frontend makes a request to `https://ixhxngwbxniggsizire.supabase.co/functions/v1/geocode-comps`, it's hitting the **deployed version** of the edge function, not the local code. The deployed version apparently:
1. Either doesn't exist (404 suggests endpoint not found)
2. Or doesn't properly handle OPTIONS preflight requests
3. Or is an older version without CORS headers

## Solution: Deploy the Edge Function

### Prerequisites

- Supabase CLI (available via `npx supabase`)
- Supabase Access Token (required for deployment)

### Deployment Command

```bash
# Set access token (one-time, or add to .env)
export SUPABASE_ACCESS_TOKEN="your-personal-access-token"

# Deploy the specific function
npx supabase functions deploy geocode-comps --project-ref shhwgkabmhnjwkgztzre

# Or deploy all functions
npx supabase functions deploy --project-ref shhwgkabmhnjwkgztzre
```

### Obtaining a Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Create a new personal access token
3. Add it to your environment or CI/CD secrets

### Alternative: Supabase CLI Login

```bash
npx supabase login
# This will open a browser for authentication
# Then you can deploy without setting SUPABASE_ACCESS_TOKEN
```

## Verification After Deployment

After deploying, test the feature:

1. Navigate to http://localhost:3000/deal-history
2. Click "View" on any deal with comps (e.g., "1432 Murray Ct SW, Marietta, GA 30064")
3. Click the "Comps" tab
4. Click "Geocode & Show Map"
5. **Expected behavior**: 
   - Progress indicator should advance: "Geocoding addresses (1/5)...", "(2/5)...", etc.
   - After completion, a map should appear with markers for the subject property and 5 comparable sales
   - Clicking markers should show InfoWindow popups with property details

## Additional Notes

### Why 60 Seconds Wait Time?

The user expected geocoding to take up to 60 seconds because:
- Edge function has a 10-second timeout
- Each of 5 addresses can take up to 5 seconds to geocode via Google Maps API
- Nominatim fallback adds additional time
- Total: 10s + (5 addresses × 5s) + fallback = ~60s maximum

However, in the current broken state, the request fails immediately (within ~150ms) due to CORS, so no actual geocoding occurs.

### Architecture Context

- **Frontend**: React app running at http://localhost:3000 (Vite dev server)
- **Backend**: Remote Supabase project at `shhwgkabmhnjwkgztzre.supabase.co`
- **Edge Functions**: Deployed separately to Supabase, running on Deno runtime
- **No Local Backend**: Unlike typical full-stack apps, there's no local backend server. The frontend always connects to the remote Supabase instance.

## Testing Checklist

- [ ] Obtain Supabase access token
- [ ] Deploy geocode-comps function
- [ ] Verify deployment in Supabase dashboard (Functions section)
- [ ] Test geocoding on a deal with comps
- [ ] Verify progress indicators (0/5 → 1/5 → ... → 5/5)
- [ ] Confirm map appears with markers
- [ ] Click markers to verify InfoWindow popups
- [ ] Check browser console for any remaining errors

## Related Files

- `/workspace/supabase/functions/geocode-comps/index.ts` - Edge function source (✅ CORS headers present)
- `/workspace/supabase/functions/_shared/cors.ts` - Shared CORS utility
- `/workspace/src/utils/geocodeComps.js` - Frontend geocoding utility
- `/workspace/src/lib/customSupabaseClient.js` - Supabase client configuration
- `/workspace/AGENTS.md` - Architecture documentation

---

**Status**: Issue diagnosed. Code fix implemented locally. Awaiting deployment to remote Supabase project.

**Last Updated**: 2026-02-25
