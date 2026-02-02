/** Deno global provided by Supabase Edge Runtime */
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

// npm: specifier is resolved at runtime by Supabase Edge/Deno
// @ts-expect-error - Deno resolves npm:@supabase/supabase-js@2 at runtime
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  return null;
}
function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}), ...corsHeaders },
  });
}
function createSupabaseAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

const RENTCAST_BASE = "https://api.rentcast.io/v1";
/** Up to 3 RentCast calls per request (avm/value first, then listings/sale and properties fallback, optional sale by id); limit is per month. */
const RENTCAST_LIMIT = 50;

function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getRentCastKey(): string | null {
  return Deno.env.get("RENTCAST_API_KEY")?.trim() || null;
}

/** Normalize and validate request data before calling RentCast. Returns 400 if invalid. */
function validateAndNormalize(body: Record<string, unknown>): { valid: true; address: string; zipCode: string; city?: string; state?: string } | { valid: false; error: string } {
  const rawAddress = String(body?.address ?? body?.formattedAddress ?? "").trim();
  const address = rawAddress.replace(/\s+/g, " ").trim();
  const zipRaw = String(body?.zipCode ?? body?.zip_code ?? "").trim().replace(/\D/g, "").slice(0, 5);
  const zipCode = zipRaw;
  const city = (body?.city != null && body?.city !== "") ? String(body.city).trim() : undefined;
  const stateRaw = String(body?.state ?? body?.stateCode ?? body?.state_code ?? "").trim();
  const state = stateRaw ? stateRaw.slice(0, 2).toUpperCase() : undefined;

  if (!address || address.length < 5) {
    return { valid: false, error: "address is required and must be at least 5 characters" };
  }
  if (zipCode.length !== 5) {
    return { valid: false, error: "zipCode must be a 5-digit US ZIP" };
  }
  return { valid: true, address, zipCode, city, state };
}

async function getUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string
): Promise<{ realie_count: number; rentcast_count: number }> {
  const { data } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  if (data) return { realie_count: data.realie_count ?? 0, rentcast_count: data.rentcast_count ?? 0 };
  await supabase.from("api_usage").upsert(
    { user_id: userId, year_month: ym, realie_count: 0, rentcast_count: 0, updated_at: new Date().toISOString() },
    { onConflict: "user_id,year_month" }
  );
  return { realie_count: 0, rentcast_count: 0 };
}

async function incrementUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string,
  type: "rentcast"
): Promise<void> {
  const { data: row } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  const rentcast = ((row?.rentcast_count ?? 0) as number) + (type === "rentcast" ? 1 : 0);
  await supabase
    .from("api_usage")
    .upsert(
      {
        user_id: userId,
        year_month: ym,
        realie_count: (row?.realie_count ?? 0) as number,
        rentcast_count: rentcast,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year_month" }
    );
}

function parseSaleDate(val: unknown): number {
  if (!val) return 0;
  const s = String(val).trim().slice(0, 10);
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

/** True if the given sale date (or soldDate) is in the future; used to exclude active listings from comps. */
function isSaleDateInFuture(comp: Record<string, unknown>): boolean {
  const ms = parseSaleDate(comp.saleDate ?? comp.soldDate);
  return ms > 0 && ms > Date.now();
}

/** Normalize address for comparison: extract street (before first comma), lowercase, collapse spaces, remove street suffixes. */
function normalizeAddressForComparison(addr: string | undefined): string {
  if (!addr) return "";
  let normalized = String(addr).toLowerCase().replace(/\s+/g, " ").trim();
  // Extract just street address (before first comma) for "1902 Mural Cir" vs "1902 Mural Cir, Morrow, GA 30260"
  const commaIndex = normalized.indexOf(",");
  if (commaIndex > 0) {
    normalized = normalized.substring(0, commaIndex).trim();
  }
  // Remove street suffixes for "1902 Mural Circle" vs "1902 Mural Cir"
  normalized = normalized.replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way|place|pl)\b\.?$/gi, "").trim();
  return normalized;
}

/** True if a normalized string looks like a street address (starts with number). */
function looksLikeStreetAddress(norm: string): boolean {
  return norm.length >= 10 && /^\d/.test(norm);
}

/** True if comp is the subject property (match by ID or normalized address). */
function isSubjectComp(
  comp: Record<string, unknown>,
  subjectAddress: string | undefined,
  propertyId: string | undefined
): boolean {
  if (propertyId && String(propertyId).trim()) {
    const compId = String(comp.id ?? comp.propertyId ?? comp.parcelId ?? "").trim();
    if (compId && compId === String(propertyId).trim()) return true;
  }
  if (subjectAddress && String(subjectAddress).trim()) {
    const compAddr = comp.address ?? comp.formattedAddress ?? comp.streetAddress;
    const compAddrStr = compAddr != null ? String(compAddr).trim() : "";
    if (!compAddrStr) return false;
    const normSubj = normalizeAddressForComparison(subjectAddress);
    const normComp = normalizeAddressForComparison(compAddrStr);
    if (!normSubj || !normComp) return false;
    if (normSubj === normComp) return true;
    if (normComp.includes(normSubj) && looksLikeStreetAddress(normSubj)) return true;
    if (normSubj.includes(normComp) && looksLikeStreetAddress(normComp)) return true;
  }
  return false;
}

function buildCompAddress(p: Record<string, unknown>): string {
  const street = [p.formattedAddress, p.address, p.streetAddress, p.street_address, p.line1, p.streetLine1].filter(Boolean)[0];
  const parts = [street, p.city, p.state, p.zipCode ?? p.zip_code ?? p.zip].filter(Boolean);
  const a = parts.join(", ").trim();
  if (a) return a;
  const cityStateZip = [p.city, p.state, p.zipCode ?? p.zip_code ?? p.zip].filter(Boolean).join(", ").trim();
  return cityStateZip || String(p.address ?? p.formattedAddress ?? p.id ?? "").trim();
}

function mapPropertyRecordToComp(p: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!p || typeof p !== "object") return null;
  const a = buildCompAddress(p);
  if (!a) return null;
  const history = Array.isArray(p.history) ? p.history : [];
  const lastSale = history.length ? (history[0] as Record<string, unknown>) : null;
  const salePrice = Number(
    p.lastSalePrice ?? p.last_sale_price ?? lastSale?.price ?? lastSale?.salePrice ?? lastSale?.closePrice ?? p.price ?? 0
  );
  const saleDate =
    p.lastSaleDate ?? p.last_sale_date ?? lastSale?.saleDate ?? lastSale?.closeDate ?? lastSale?.date ?? "";
  return {
    address: a,
    salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
    saleDate: saleDate ? String(saleDate).slice(0, 10) : undefined,
    dom: p.daysOnMarket ?? p.dom ?? lastSale?.daysOnMarket ?? undefined,
    sqft: p.squareFootage ?? p.sqft ?? p.square_footage,
    beds: p.bedrooms ?? p.beds,
    baths: p.bathrooms ?? p.baths,
    id: p.id ?? p.propertyId ?? p.parcelId,
    basement: p.basement != null ? String(p.basement) : undefined,
    basementType: p.basementType != null ? String(p.basementType) : undefined,
    basementCondition: p.basementCondition != null ? String(p.basementCondition) : undefined,
    parkingType: (p.garageType ?? p.parkingType) != null ? String(p.garageType ?? p.parkingType) : undefined,
    parkingSpaces: p.parkingSpaces ?? p.garageSpaces,
    levels: p.levels ?? p.stories,
  };
}

function parsePropertiesList(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const list =
    Array.isArray(d) ? d
    : Array.isArray(d.properties) ? d.properties
    : Array.isArray(d.listings) ? d.listings
    : Array.isArray(d.data) ? d.data
    : Array.isArray(d.results) ? d.results
    : [];
  return list.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
}

function mapRentCastToComp(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  // AVM comparables use formattedAddress/addressLine1; listings use formattedAddress/address/streetAddress
  const street = item.formattedAddress ?? item.address ?? item.streetAddress ?? item.addressLine1 ?? (item as Record<string, unknown>).street_line_1;
  const address = [street, item.city, item.state, item.zipCode].filter(Boolean).join(", ");
  const a = (address || String(item.address ?? item.formattedAddress ?? item.addressLine1 ?? "")).trim();
  if (!a) return null;
  const salePrice = Number(item.price ?? item.salePrice ?? item.sale_price ?? item.lastSalePrice ?? 0);
  const saleDateRaw = item.soldDate ?? item.saleDate ?? item.sale_date ?? item.lastSaleDate ?? item.closeDate ?? "";
  const listedDateMs = parseSaleDate(item.listedDate);
  const saleDate = saleDateRaw
    ? String(saleDateRaw).trim().slice(0, 10)
    : listedDateMs > 0 && listedDateMs <= Date.now()
      ? String(item.listedDate).trim().slice(0, 10)
      : "";
  const basement = item.basement ?? item.basementType ?? item.basement_type;
  const basementType = item.basementType ?? item.basement_type;
  const basementCondition = item.basementCondition ?? item.basement_condition;
  const parkingType = item.garageType ?? item.garage_type ?? item.parkingType ?? item.parking_type ?? item.carport ?? item.streetParking;
  const parkingSpaces = item.parkingSpaces ?? item.parking_spaces ?? item.garageSpaces ?? item.numberOfParking ?? item.garage_spaces;
  const levels = item.levels ?? item.stories ?? item.numberOfStories ?? item.stories_count;
  return {
    address: a,
    salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
    saleDate: saleDate || undefined,
    dom: item.daysOnMarket ?? item.dom ?? item.days_on_market,
    sqft: item.squareFootage ?? item.sqft ?? item.square_footage,
    beds: item.bedrooms ?? item.beds,
    baths: item.bathrooms ?? item.baths,
    id: item.id ?? item.propertyId ?? item.parcelId,
    basement: basement != null ? String(basement) : undefined,
    basementType: basementType != null ? String(basementType) : undefined,
    basementCondition: basementCondition != null ? String(basementCondition) : undefined,
    parkingType: parkingType != null ? String(parkingType) : undefined,
    parkingSpaces: parkingSpaces != null ? (Number(parkingSpaces) || String(parkingSpaces)) : undefined,
    levels: levels != null ? (Number(levels) || String(levels)) : undefined,
  };
}

async function fetchRentCastCompsFromListings(address: string, zipCode: string, limit: number): Promise<Array<Record<string, unknown>>> {
  const apiKey = getRentCastKey();
  if (!apiKey) return [];
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const cutoffMs = twelveMonthsAgo.getTime();
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (zipCode) params.set("zipCode", zipCode);
  params.set("limit", "20");
  const url = `${RENTCAST_BASE}/listings/sale?${params.toString()}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.listings ?? data?.comps ?? data?.data ?? [];
  const mapped = list.map(mapRentCastToComp).filter(Boolean) as Array<Record<string, unknown>>;
  const nowMs = Date.now();
  const within12mo = mapped.filter((c) => {
    const ts = parseSaleDate(c.saleDate ?? c.soldDate);
    return ts >= cutoffMs && (ts === 0 || ts <= nowMs);
  });
  within12mo.sort((a, b) => parseSaleDate(b.saleDate ?? b.soldDate) - parseSaleDate(a.saleDate ?? a.soldDate));
  return within12mo.slice(0, limit);
}

async function fetchRentCastCompsFromProperties(
  zipCode: string,
  limit: number,
  opts?: { fullAddress?: string; city?: string; state?: string }
): Promise<Array<Record<string, unknown>>> {
  const apiKey = getRentCastKey();
  if (!apiKey) return [];
  const tryFetch = async (addr: string | null): Promise<Array<Record<string, unknown>>> => {
    const params = new URLSearchParams();
    params.set("zipCode", zipCode);
    if (addr) params.set("address", addr);
    if (opts?.city) params.set("city", opts.city.trim());
    if (opts?.state) params.set("state", opts.state.trim().slice(0, 2).toUpperCase());
    params.set("saleDateRange", "365");
    params.set("limit", "20");
    const url = `${RENTCAST_BASE}/properties?${params.toString()}`;
    const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const list = parsePropertiesList(data);
    const mapped = list.map(mapPropertyRecordToComp).filter(Boolean) as Array<Record<string, unknown>>;
    mapped.sort((a, b) => parseSaleDate(b.saleDate ?? b.soldDate) - parseSaleDate(a.saleDate ?? a.soldDate));
    return mapped.slice(0, limit);
  };
  let comps = opts?.fullAddress ? await tryFetch(opts.fullAddress) : await tryFetch(null);
  if (comps.length === 0 && opts?.fullAddress) comps = await tryFetch(null);
  return comps;
}

function buildFullAddress(opts: { address: string; zipCode: string; city?: string; state?: string }): string {
  const stateNorm = opts.state?.trim().slice(0, 2).toUpperCase() || undefined;
  const parts = [opts.address.trim(), opts.city?.trim(), stateNorm, opts.zipCode].filter(Boolean);
  return parts.join(", ");
}

/** GET /v1/avm/value - returns value estimate and comparables array; primary source for comps. */
async function fetchRentCastCompsFromAvmValue(address: string, zipCode: string): Promise<Array<Record<string, unknown>>> {
  const apiKey = getRentCastKey();
  if (!apiKey) return [];
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (zipCode) params.set("zipCode", zipCode);
  const url = `${RENTCAST_BASE}/avm/value?${params.toString()}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const comparables = Array.isArray(d.comparables) ? d.comparables : [];
  const mapped = comparables
    .map((item: unknown) => mapRentCastToComp(item as Record<string, unknown>))
    .filter(Boolean) as Array<Record<string, unknown>>;
  return mapped;
}

async function fetchRentCastComps(
  address: string,
  zipCode: string,
  limit: number,
  opts?: { fullAddress?: string; city?: string; state?: string }
): Promise<Array<Record<string, unknown>>> {
  let comps = await fetchRentCastCompsFromAvmValue(address, zipCode);
  if (comps.length === 0) comps = await fetchRentCastCompsFromListings(address, zipCode, limit);
  if (comps.length === 0) comps = await fetchRentCastCompsFromProperties(zipCode, limit, opts);
  return comps.slice(0, limit);
}

/** GET /v1/listings/sale/{id} - returns single sale listing for that property ID. */
async function fetchRentCastSaleListingById(id: string): Promise<Record<string, unknown> | null> {
  const apiKey = getRentCastKey();
  if (!apiKey || !id || !String(id).trim()) return null;
  const url = `${RENTCAST_BASE}/listings/sale/${encodeURIComponent(String(id).trim())}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const record = (d.data && typeof d.data === "object" ? d.data : d) as Record<string, unknown>;
  const mapped = mapRentCastToComp(record);
  return mapped;
}

/** Check if two addresses match - strips street suffixes, normalizes whitespace and case */
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

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = validateAndNormalize(body);
    if (!validation.valid) {
      return json({ error: validation.error }, { status: 400 });
    }
    const { address, zipCode, city, state } = validation;
    const userId = String(body?.userId ?? body?.user_id ?? "").trim();
    const propertyId = String(body?.propertyId ?? body?.property_id ?? "").trim() || undefined;
    // Fallback to address if subjectAddress not provided (e.g. comps-only refresh without property response)
    const subjectAddress = String(body?.subjectAddress ?? body?.subject_address ?? body?.address ?? "").trim() || undefined;
    const debugRequested = body?.debug === true;

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const usage = userId ? await getUsage(supabase, userId, ym) : { realie_count: 0, rentcast_count: 0 };
    const rentcastAllowed = !userId || usage.rentcast_count + 3 <= RENTCAST_LIMIT;

    let recentComps: Array<Record<string, unknown>> = [];
    let subjectSaleListing: Record<string, unknown> | null = null;
    const errors: string[] = [];
    let debugComps: { compsRawCount: number; notSubjectCount: number; recentCompsCount: number } | null = null;

    const fullAddress = buildFullAddress({ address, zipCode, city, state });

    if (getRentCastKey() && rentcastAllowed) {
      try {
        // AVM first (returns comparables for this address), then listings/properties fallback
        let compsRaw = await fetchRentCastComps(address, zipCode, 15, { fullAddress, city, state });

        // Filter out the subject property by ID and normalized address (isSubjectComp)
        const notSubject = compsRaw.filter((c) => !isSubjectComp(c, subjectAddress, propertyId));

        // Prefer comps within 12 months and not future; otherwise take any non-future comps (AVM listing dates vary)
        const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const recentOnly = notSubject.filter((c) => {
          const saleMs = parseSaleDate(c.saleDate ?? c.soldDate);
          if (saleMs === 0) return true;
          if (saleMs > nowMs) return false;
          return saleMs >= oneYearAgoMs;
        });
        recentComps = recentOnly.length > 0 ? recentOnly.slice(0, 5) : notSubject.filter((c) => !isSaleDateInFuture(c)).slice(0, 5);

        // If still no comps and we have a propertyId, try fetching the subject as a sale listing
        if (recentComps.length === 0 && propertyId) {
          const subject = await fetchRentCastSaleListingById(propertyId);
          if (subject && !isSaleDateInFuture(subject)) {
            subjectSaleListing = subject;
            if (userId) await incrementUsage(supabase, userId, ym, "rentcast");
          }
        }
        if (userId) await incrementUsage(supabase, userId, ym, "rentcast");
        if (debugRequested) debugComps = { compsRawCount: compsRaw.length, notSubjectCount: notSubject.length, recentCompsCount: recentComps.length };
      } catch (e) {
        console.error("RentCast comps fetch error:", e);
        errors.push("RentCast comps: " + (e as Error).message);
      }
    } else if (userId && !rentcastAllowed) {
      errors.push(`RentCast monthly limit (${RENTCAST_LIMIT}) reached.`);
    }

    if (recentComps.length === 0 && getRentCastKey() && rentcastAllowed && !errors.some((e) => e.includes("comps"))) {
      errors.push("No comparable sales found for this address or area.");
    }

    const result: Record<string, unknown> = {
      recentComps,
      source: "RentCast",
    };
    if (subjectSaleListing != null) result.subjectSaleListing = subjectSaleListing;
    if (debugRequested) {
      result._debug = { address, zipCode, city: city ?? null, state: state ?? null, propertyId: propertyId ?? null, subjectAddress: subjectAddress ?? null, fullAddress };
      if (debugComps) result._debugComps = debugComps;
    }
    if (userId) {
      const { data: finalUsage } = await supabase
        .from("api_usage")
        .select("realie_count, rentcast_count")
        .eq("user_id", userId)
        .eq("year_month", ym)
        .maybeSingle();
      result.usage = {
        realie_count: (finalUsage?.realie_count ?? usage.realie_count) as number,
        rentcast_count: (finalUsage?.rentcast_count ?? usage.rentcast_count) as number,
        realie_limit: 0,
        rentcast_limit: RENTCAST_LIMIT,
      };
    }
    if (errors.length) result.warnings = errors;
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});