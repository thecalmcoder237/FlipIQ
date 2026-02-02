# Property Intelligence Debug Guide

Use this when Property Details show N/A or "No comparable sales found" for an address that previously returned data.

---

## 1. Where to see debug output

- **Frontend logs (request + response):** `.cursor/debug.log` (NDJSON, one JSON object per line). Written when the Cursor debug ingest is running and you click the Property Details refresh icon.
- **Browser console:** `📤 [Edge Service] Request to 'fetch-property-intelligence'` and `fetch-comps` show the payloads sent and received.
- **Edge logs (deployed):** Supabase Dashboard → Edge Functions → `fetch-property-intelligence` and `fetch-comps` → Logs. Shows `RentCast property fetch error:` and `RentCast comps fetch error:` if APIs throw.

---

## 2. Flow (what runs when you click refresh)

1. **Frontend** (`PropertyIntelligenceSection.jsx`) builds request from `inputs`:
   - `address` = `inputs.address`
   - `zipCode` = 5-digit from `inputs.zipCode`
   - `city` = `inputs.city || inputs.propertyIntelligence?.city`
   - `county` = `inputs.county || inputs.propertyIntelligence?.county`
   - `state` = `inputs.propertyIntelligence?.state || inputs.state`
2. **Property details** (`fetch-property-intelligence`):
   - **Validation:** Address required and at least 5 characters; zipCode must be exactly 5 digits (non-digits stripped). State trimmed to 2 chars uppercase; city trimmed. Invalid requests return 400 with a clear message before any RentCast call.
   - Calls RentCast only for property: (1) GET `/v1/properties?address=...&zipCode=...&limit=1`; (2) if a result has an id, GET `/v1/properties/{id}` for full record. Up to 2 RentCast calls per request; does **not** return comps.
   - Returns: `{ ...property, rawRentCastRecord?, source: "RentCast", usage, warnings? }`.
3. **Comps** (`fetch-comps`):
   - **Validation:** Same as above (address ≥ 5 chars, zipCode 5 digits, optional state/city).
   - (1) GET `/v1/listings/sale?address=...&zipCode=...&limit=20`; (2) if empty, GET `/v1/properties?zipCode=...&saleDateRange=365&limit=20`; (3) if still no comps and `propertyId` is provided (from property data), **fallback:** GET `/v1/listings/sale/{id}` (RentCast Sale Listing by Id) and return as `subjectSaleListing`.
   - Returns: `{ recentComps, subjectSaleListing?, source: "RentCast", usage, warnings? }`.
4. **Frontend** merges property response + comps response into one object, normalizes (`propertyIntelligenceSchema.js`), then calls `onPropertyDataFetch(normalized)` so the parent stores it in `inputs.propertyIntelligence` and displays it. One “refresh” = 1 property call + 1 comps call (plus optional sale-by-id fallback call). Both functions share the same RentCast monthly limit (50).

---

## 3. What can cause N/A

| Cause | Effect |
|--------|--------|
| **RentCast property or comps returns empty** | Property details come from `fetch-property-intelligence` (GET `/v1/properties`); comps from `fetch-comps` (GET `/v1/listings/sale`, then fallbacks). If either returns no match for the address/ZIP, you get empty property and/or empty comps. |
| **RentCast limit reached** | Property and comps each use RentCast; one refresh = 1 property call + 1 comps call (plus optional sale-by-id fallback). Both share the same monthly limit (50). If limit is reached, the corresponding edge returns empty and may add a warning. |
| **Toast: "No data found" when empty** | When the response has no usable property fields and no comps, we show "No data found". We still call `onPropertyDataFetch(normalized)` with that empty payload, so the UI shows N/A. |

---

## 4. What to check when you get N/A

1. **Request params (in `.cursor/debug.log`)**  
   Look for `PropertyIntelligenceSection.jsx:requestParams`. Confirm:
   - `address` and `zipToSend` (5 digits) are correct.
     RentCast uses address and zipCode for both property and comps.

2. **Raw edge response (in `.cursor/debug.log`)**  
   Look for `PropertyIntelligenceSection.jsx:afterFetch` and `PropertyIntelligenceSection.jsx:rawResponseDump` (if present). Check:
   - `dataError`: if set, edge returned an error (usually you’d see "Fetch Failed").
   - `topKeys`: should include `recentComps`, `source` ("RentCast"); if the edge returned property data, you’ll also see keys like `yearBuilt`, `propertyType`, etc.

3. **Edge debug (optional)**  
   Enable debug: in the browser console run `localStorage.setItem('propertyIntelDebug', '1')`, then click the Property Details refresh icon. The edge response will include `_debug`: `address`, `zipCode`, `city`, `county`. Turn off with `localStorage.removeItem('propertyIntelDebug')`.

4. **Deal input vs saved data**  
   On refresh (or page load), `inputs` come from the deal loaded from the DB (`loadDeal`). If `property_intelligence` is not stored or not loaded, `inputs.propertyIntelligence` is null and the UI shows N/A until you click refresh again. After a fetch, we save the deal (including `propertyIntelligence`); if that save fails or the column is missing, the next load will show no property intel.

---

## 5. Quick checklist

- [ ] `.cursor/debug.log` exists and has entries after clicking the Property Details refresh icon.
- [ ] `requestParams`: address and zip (5 digits) look correct.
- [ ] `afterFetch`: response has `recentComps`, `source: "RentCast"`; if empty, RentCast returned no match for this address/ZIP.
- [ ] Browser console: no "Fetch Failed" or edge error; response body has the shape you expect.
- [ ] Same address worked before: compare request params (address, zip) then vs now.

---

## 6. Cross-reference with send-claude-request (working comps)

Comps in **send-claude-request** (requestType `analyzePropertyComps`) use the **request** `address` and `zipCode` for GET `/v1/listings/sale`. **fetch-comps** does the same: request address and zipCode (with validation/normalization) so the RentCast API gets a consistent format.

## 7. Files involved

- **Property edge:** `supabase/functions/fetch-property-intelligence/index.ts` (validation, RentCast property only; no comps).
- **Comps edge:** `supabase/functions/fetch-comps/index.ts` (validation, RentCast listings/sale + properties fallback + sale listing by property ID fallback).
- **Frontend fetch:** `src/components/PropertyIntelligenceSection.jsx` (calls property then comps, merges responses, toast, onPropertyDataFetch).
- **Client:** `src/services/edgeFunctionService.js` (`fetchPropertyIntelligence`, `fetchComps`, invokes edges, throws on `data.error`).
- **Normalizer:** `src/utils/propertyIntelligenceSchema.js` (raw → normalized; handles `subjectSaleListing` and empty comps).
- **Deal load/save:** `src/services/dealService.js`, `src/utils/databaseMapping.js` (`property_intelligence` ↔ `propertyIntelligence`).


