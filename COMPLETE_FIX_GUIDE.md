# Complete Fix: Subject Property Appearing in Comps

## Architecture Overview

You have a **two-function architecture**:

```
┌─────────────────────────────────┐
│  fetch-property-intelligence    │
│  (Document 6)                   │
│  • Fetches property details     │
│  • Returns: property data        │
│  • Does NOT fetch comps         │
└─────────────────────────────────┘
                ↓
         (property data)
                ↓
┌─────────────────────────────────┐
│  fetch-comps                    │
│  (Document 2)                   │
│  • Fetches comparable sales     │
│  • Returns: recentComps array   │
│  • Should filter out subject    │
└─────────────────────────────────┘
```

## The Problem

When calling `fetch-comps`, it returns the subject property itself in the comps list:

```
Subject Property: "1902 Mural Cir, Morrow, GA 30260"
Comps Returned:  ["1902 Mural Cir, Morrow, GA 30260"] ← WRONG!
```

## Root Cause

The `fetch-comps` function receives:
- `address`: "1902 Mural Cir"
- `zipCode`: "30260"
- `propertyId`: (optional, might be empty)

But the API might return addresses in different formats:
- API returns: "1902 Mural Cir, Morrow, GA 30260, Morrow, GA, 30260"
- Request sent: "1902 Mural Cir"

The original filtering code didn't handle this properly:
```typescript
const notSubject = propertyId
  ? compsRaw.filter((c) => String(c.id ?? c.propertyId ?? "").trim() !== propertyId)
  : compsRaw; // ← NO FILTERING if no propertyId!
```

## The Solution

### Frontend: Pass Property Details to fetch-comps

When calling `fetch-comps`, you need to pass the property details from `fetch-property-intelligence`:

```javascript
// 1. First, fetch property details
const propertyResponse = await fetch('/fetch-property-intelligence', {
  method: 'POST',
  body: JSON.stringify({
    address: '1902 Mural Cir',
    zipCode: '30260',
    city: 'Morrow',
    state: 'GA',
    userId: 'user123'
  })
});
const propertyData = await propertyResponse.json();

// 2. Then, fetch comps and pass the property details
const compsResponse = await fetch('/fetch-comps', {
  method: 'POST',
  body: JSON.stringify({
    address: '1902 Mural Cir',
    zipCode: '30260',
    city: 'Morrow',
    state: 'GA',
    propertyId: propertyData.propertyId, // ← Pass this!
    userId: 'user123'
  })
});
```

### Backend: Enhanced Filtering in fetch-comps

The fixed `fetch-comps.ts` (already provided) includes:

1. **Smart address normalization:**
```typescript
function normalizeAddressForComparison(addr: string | undefined): string {
  if (!addr) return "";
  return addr
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way|place|pl)\b\.?/g, "")
    .replace(/[,\.]/g, "")
    .trim();
}
```

This handles:
- "1902 Mural Cir" vs "1902 MURAL CIR" (case)
- "1902 Mural Circle" vs "1902 Mural Cir" (suffix)
- "1902  Mural   Cir" vs "1902 Mural Cir" (whitespace)
- "1902 Mural Cir, Morrow, GA" vs "1902 Mural Cir" (partial match)

2. **Dual filtering (ID + Address):**
```typescript
const notSubject = compsRaw.filter((c) => {
  // Filter by propertyId if available
  if (propertyId && c.id) {
    const compId = String(c.id ?? c.propertyId ?? c.parcelId ?? "").trim();
    if (compId && compId === propertyId) {
      return false; // Exclude
    }
  }
  
  // ALWAYS filter by address (even without propertyId)
  const compAddress = c.address ?? c.formattedAddress ?? c.streetAddress;
  if (addressesMatch(compAddress, address) || addressesMatch(compAddress, fullAddress)) {
    return false; // Exclude
  }
  
  return true; // Keep
});
```

## Test Cases

### Case 1: propertyId Available
**Request:**
```json
{
  "address": "1902 Mural Cir",
  "zipCode": "30260",
  "propertyId": "ABC123"
}
```

**API Returns:**
```json
[
  { "id": "ABC123", "address": "1902 Mural Cir, Morrow, GA 30260" },
  { "id": "DEF456", "address": "1904 Mural Cir, Morrow, GA 30260" }
]
```

**Result:**
- First property filtered by `propertyId` ✅
- Only second property returned ✅

### Case 2: No propertyId (Address-only filtering)
**Request:**
```json
{
  "address": "1902 Mural Cir",
  "zipCode": "30260"
}
```

**API Returns:**
```json
[
  { "id": "ABC123", "address": "1902 Mural Cir, Morrow, GA 30260, Morrow, GA, 30260" },
  { "id": "DEF456", "address": "1904 Mural Cir, Morrow, GA 30260" }
]
```

**Result:**
- First property filtered by address match ✅
- Only second property returned ✅

### Case 3: Address Variation
**Request:**
```json
{
  "address": "1902 Mural Circle",
  "zipCode": "30260"
}
```

**API Returns:**
```json
[
  { "id": "ABC123", "address": "1902 Mural Cir, Morrow, GA 30260" },
  { "id": "DEF456", "address": "1904 Mural Cir, Morrow, GA 30260" }
]
```

**Result:**
- First property filtered (Circle → Cir normalized) ✅
- Only second property returned ✅

## Deployment Steps

### 1. Deploy Updated fetch-comps Function
```bash
supabase functions deploy fetch-comps --no-verify-jwt
```

### 2. Verify Frontend Passes propertyId
Check your frontend code where you call `fetch-comps`. Make sure it passes:
- `address` (required)
- `zipCode` (required)
- `propertyId` (optional but recommended - from `fetch-property-intelligence` response)
- `city` (optional)
- `state` (optional)

Example:
```javascript
// In your PropertyDetails component or wherever comps are fetched
const fetchComps = async (propertyDetails) => {
  const response = await fetch('/api/fetch-comps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: propertyDetails.address,
      zipCode: propertyDetails.zipCode,
      city: propertyDetails.city,
      state: propertyDetails.state,
      propertyId: propertyDetails.propertyId, // ← Important!
      userId: currentUser.id
    })
  });
  return await response.json();
};
```

### 3. Test
Test with the address that was showing the issue:
- Address: "1902 Mural Cir, Morrow, GA 30260"
- Expected: Should NOT appear in its own comps
- Expected: Should return other nearby properties

## Why Both Functions Stay Separate

**Benefits of keeping them separate:**
1. **Modularity**: Property details and comps can be called independently
2. **Caching**: Can cache property details separately from comps
3. **Usage tracking**: Each has its own API call count
4. **Different use cases**: 
   - Property details: Used by property form, analysis
   - Comps: Used by valuation, market analysis, Claude features

**The key is proper communication:**
- Frontend must pass `propertyId` from property response to comps request
- Backend must filter using both ID and address

## Alternative: Single Endpoint (Future Enhancement)

If you want to simplify in the future, you could create a combined endpoint:

```typescript
// fetch-property-with-comps.ts
Deno.serve(async (req) => {
  // 1. Fetch property details
  const property = await fetchRentCastProperty(address, zipCode);
  
  // 2. Fetch comps and filter using property.id and property.address
  const comps = await fetchRentCastComps(address, zipCode);
  const filteredComps = comps.filter(c => 
    c.id !== property.id && 
    !addressesMatch(c.address, property.address)
  );
  
  // 3. Return both
  return { property, recentComps: filteredComps };
});
```

But for now, the two-function approach works fine with proper filtering!

## Quick Fix Checklist

- [ ] Deploy updated `fetch-comps.ts` function
- [x] Verify frontend passes `propertyId` from property response to comps request (implemented in `PropertyIntelligenceSection.jsx`: full refresh and comps-only refresh both pass `propertyId` and `subjectAddress`)
- [ ] Test with "1902 Mural Cir, Morrow, GA 30260"
- [ ] Verify subject property does NOT appear in comps
- [ ] Verify other properties DO appear in comps

## Expected Behavior After Fix

**Before:**
```json
{
  "recentComps": [
    {
      "address": "1902 Mural Cir, Morrow, GA 30260, Morrow, GA, 30260",
      "salePrice": 200000
    }
  ]
}
```

**After:**
```json
{
  "recentComps": [
    {
      "address": "1904 Oak Street, Morrow, GA 30260",
      "salePrice": 195000
    },
    {
      "address": "1910 Pine Ave, Morrow, GA 30260",
      "salePrice": 205000
    }
  ]
}
```

Subject property completely excluded! ✅
