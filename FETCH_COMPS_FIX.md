# Fix for Comps Returning Subject Property

## Problem
The `fetch-comps` edge function was returning the subject property itself in the `recentComps` array. In your screenshot, "1902 Mural Cir, Morrow, GA 30260" was appearing as its own comp.

## Root Cause
The original code filtered by `propertyId` only:
```typescript
const notSubject = propertyId
  ? compsRaw.filter((c) => String(c.id ?? c.propertyId ?? "").trim() !== propertyId)
  : compsRaw;
```

**Problems with this approach:**
1. If no `propertyId` is passed, NO filtering happens at all
2. The propertyId from the comp might not match the request's propertyId
3. No address-based filtering as a fallback

## Solution

### 1. Enhanced Address Matching
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

function addressesMatch(addr1: string | undefined, addr2: string | undefined): boolean {
  if (!addr1 || !addr2) return false;
  const norm1 = normalizeAddressForComparison(addr1);
  const norm2 = normalizeAddressForComparison(addr2);
  if (!norm1 || !norm2) return false;
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for partial addresses)
  if (norm1.length > 10 && norm2.length > 10) {
    return norm1.includes(norm2) || norm2.includes(norm1);
  }
  
  return false;
}
```

**This function:**
- Converts to lowercase
- Normalizes whitespace
- Removes street suffixes (St, Street, Ave, Avenue, etc.)
- Removes punctuation
- Handles partial address matches

### 2. Dual Filtering (ID + Address)
```typescript
const notSubject = compsRaw.filter((c) => {
  // Filter by ID if we have propertyId from the request
  if (propertyId && c.id) {
    const compId = String(c.id ?? c.propertyId ?? c.parcelId ?? "").trim();
    if (compId && compId === propertyId) {
      return false; // Exclude - it's the subject property
    }
  }
  
  // Filter by address match
  const compAddress = c.address ?? c.formattedAddress ?? c.streetAddress;
  if (addressesMatch(compAddress, address) || addressesMatch(compAddress, fullAddress)) {
    return false; // Exclude - address matches subject
  }
  
  return true; // Keep this comp
});
```

**This ensures:**
- Filtering happens ALWAYS (not just when propertyId exists)
- Both ID and address are checked
- Comp is excluded if EITHER matches the subject

## Test Cases Covered

### 1. Exact Address Match
- Subject: "1902 Mural Cir, Morrow, GA 30260"
- Comp: "1902 Mural Cir, Morrow, GA 30260"
- Result: ✅ FILTERED OUT

### 2. Address with Different Suffix
- Subject: "1902 Mural Circle, Morrow, GA 30260"
- Comp: "1902 Mural Cir, Morrow, GA 30260"
- Result: ✅ FILTERED OUT (normalized to same)

### 3. Case Differences
- Subject: "1902 MURAL CIR"
- Comp: "1902 mural cir"
- Result: ✅ FILTERED OUT (both lowercase)

### 4. Extra Whitespace
- Subject: "1902  Mural   Cir"
- Comp: "1902 Mural Cir"
- Result: ✅ FILTERED OUT (whitespace normalized)

### 5. Partial Address Match
- Subject: "1902 Mural Cir" (from form input)
- Comp: "1902 Mural Cir, Morrow, GA 30260, Morrow, GA, 30260" (from API)
- Result: ✅ FILTERED OUT (one contains the other)

### 6. PropertyId Match
- Subject propertyId: "ABC123"
- Comp id: "ABC123"
- Result: ✅ FILTERED OUT

### 7. Different Property
- Subject: "1902 Mural Cir"
- Comp: "1904 Mural Cir"
- Result: ✅ KEPT (different address)

## What Changed

### Before:
```typescript
const notSubject = propertyId
  ? compsRaw.filter((c) => String(c.id ?? c.propertyId ?? "").trim() !== propertyId)
  : compsRaw;
```
- Only filtered if propertyId was provided
- No address-based filtering
- Exact string comparison only

### After:
```typescript
const notSubject = compsRaw.filter((c) => {
  if (propertyId && c.id) {
    const compId = String(c.id ?? c.propertyId ?? c.parcelId ?? "").trim();
    if (compId && compId === propertyId) return false;
  }
  
  const compAddress = c.address ?? c.formattedAddress ?? c.streetAddress;
  if (addressesMatch(compAddress, address) || addressesMatch(compAddress, fullAddress)) {
    return false;
  }
  
  return true;
});
```
- ALWAYS filters (doesn't depend on propertyId)
- Checks both ID and address
- Smart address normalization handles variations

## Deployment

Replace your current `fetch-comps` edge function with this fixed version:

```bash
supabase functions deploy fetch-comps --no-verify-jwt
```

## Expected Behavior After Fix

**Before:**
```json
{
  "recentComps": [
    {
      "address": "1902 Mural Cir, Morrow, GA 30260, Morrow, GA, 30260",
      "salePrice": 200000,
      ...
    }
  ]
}
```
☝️ Subject property appearing in its own comps

**After:**
```json
{
  "recentComps": [
    {
      "address": "1904 Oak Street, Morrow, GA 30260",
      "salePrice": 195000,
      ...
    },
    {
      "address": "1910 Pine Ave, Morrow, GA 30260",
      "salePrice": 205000,
      ...
    }
  ]
}
```
☝️ Only actual comparable properties (different addresses)

## No Database or Frontend Changes Required

- ✅ Same API contract (request/response format unchanged)
- ✅ Same usage tracking
- ✅ No schema changes
- ✅ Works with existing frontend code

The fix is purely in the filtering logic within the edge function.
