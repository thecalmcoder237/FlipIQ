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
const REALIE_BASE = "https://app.realie.ai/api";
/** Up to 3 RentCast calls per request (avm/value first, then listings/sale and properties fallback, optional sale by id); limit is per month. */
const RENTCAST_LIMIT = 50;
/** Realie free tier: 25/month. Adjust if on a paid plan. */
const REALIE_LIMIT = 25;
/** Max comps to return per request */
const COMPS_RESPONSE_LIMIT = 50;

function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getRentCastKey(): string | null {
  return Deno.env.get("RENTCAST_API_KEY")?.trim() || null;
}

function getRealieKey(): string | null {
  return Deno.env.get("REALIE_API_KEY")?.trim() || null;
}

type SubjectSpecs = { bedrooms?: number; bathrooms?: number };

/** Normalize and validate request data before calling APIs. Returns 400 if invalid. */
function validateAndNormalize(body: Record<string, unknown>): { valid: true; address: string; zipCode: string; city?: string; state?: string; subjectSpecs?: SubjectSpecs } | { valid: false; error: string } {
  const rawAddress = String(body?.address ?? body?.formattedAddress ?? "").trim();
  const address = rawAddress.replace(/\s+/g, " ").trim();
  const zipRaw = String(body?.zipCode ?? body?.zip_code ?? "").trim().replace(/\D/g, "").slice(0, 5);
  const zipCode = zipRaw;
  const city = (body?.city != null && body?.city !== "") ? String(body.city).trim() : undefined;
  const stateRaw = String(body?.state ?? body?.stateCode ?? body?.state_code ?? "").trim();
  const state = stateRaw ? stateRaw.slice(0, 2).toUpperCase() : undefined;

  let subjectSpecs: SubjectSpecs | undefined;
  const rawSpecs = body?.subjectSpecs ?? body?.subject_specs;
  if (rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)) {
    const s = rawSpecs as Record<string, unknown>;
    const bedrooms = s.bedrooms != null && s.bedrooms !== "" ? Number(s.bedrooms) : undefined;
    const bathrooms = s.bathrooms != null && s.bathrooms !== "" ? Number(s.bathrooms) : undefined;
    if (Number.isFinite(bedrooms) || Number.isFinite(bathrooms)) {
      subjectSpecs = {};
      if (Number.isFinite(bedrooms)) subjectSpecs.bedrooms = bedrooms;
      if (Number.isFinite(bathrooms)) subjectSpecs.bathrooms = bathrooms;
    }
  }

  if (!address || address.length < 5) {
    return { valid: false, error: "address is required and must be at least 5 characters" };
  }
  if (zipCode.length !== 5) {
    return { valid: false, error: "zipCode must be a 5-digit US ZIP" };
  }
  return { valid: true, address, zipCode, city, state, subjectSpecs };
}

/** Compute distance in miles between two lat/lng points using Haversine formula. */
function computeDistanceFromCoords(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) return NaN;
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  type: "rentcast" | "realie"
): Promise<void> {
  const { data: row } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  const rentcast = ((row?.rentcast_count ?? 0) as number) + (type === "rentcast" ? 1 : 0);
  const realie = ((row?.realie_count ?? 0) as number) + (type === "realie" ? 1 : 0);
  await supabase
    .from("api_usage")
    .upsert(
      {
        user_id: userId,
        year_month: ym,
        realie_count: realie,
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
  const commaIndex = normalized.indexOf(",");
  if (commaIndex > 0) normalized = normalized.substring(0, commaIndex).trim();
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
  const street = [p.formattedAddress, p.fullAddress, p.address, p.streetAddress, p.street_address, p.line1, p.streetLine1].filter(Boolean)[0];
  const parts = [street, p.city, p.state, p.zipCode ?? p.zip_code ?? p.zip].filter(Boolean);
  const a = parts.join(", ").trim();
  if (a) return a;
  const cityStateZip = [p.city, p.state, p.zipCode ?? p.zip_code ?? p.zip].filter(Boolean).join(", ").trim();
  return cityStateZip || String(p.address ?? p.formattedAddress ?? p.fullAddress ?? p.id ?? "").trim();
}

// ── Realie Comparables ────────────────────────────────────────────────────────

/** Map a Realie property record to our normalized comp schema. */
function mapRealieToComp(p: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!p || typeof p !== "object") return null;
  const a = buildCompAddress(p);
  if (!a) return null;

  const num = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);

  // Coordinates: top-level or in location.coordinates [lng, lat]
  let lat: number | undefined = num(p.latitude);
  let lng: number | undefined = num(p.longitude);
  if ((lat == null || lng == null) && p.location && typeof p.location === "object") {
    const loc = p.location as Record<string, unknown>;
    const coords = Array.isArray(loc.coordinates) ? loc.coordinates : null;
    if (coords && coords.length >= 2) {
      lng = num(coords[0]);
      lat = num(coords[1]);
    }
  }

  // Sale date: Realie uses transferDateObject (ISO) or transferDate (YYYYMMDD)
  const saleDateRaw = p.transferDateObject ?? p.transferDate;
  const saleDate = saleDateRaw ? String(saleDateRaw).trim().slice(0, 10) : undefined;

  // Sale price from transferPrice (most recent transfer)
  const salePrice = num(p.transferPrice ?? 0);

  return {
    address: a,
    salePrice: salePrice != null && Number.isFinite(salePrice) && salePrice > 0 ? salePrice : undefined,
    saleDate: saleDate || undefined,
    sqft: num(p.buildingArea),
    beds: p.totalBedrooms ?? undefined,
    baths: p.totalBathrooms ?? undefined,
    yearBuilt: num(p.yearBuilt) ?? undefined,
    id: p.siteId ?? p.apn ?? p.id ?? undefined,
    latitude: lat != null && Number.isFinite(lat) ? lat : undefined,
    longitude: lng != null && Number.isFinite(lng) ? lng : undefined,
    pool: p.pool != null ? Boolean(p.pool) : undefined,
    garage: p.garage != null ? Boolean(p.garage) : undefined,
    garageType: p.garageType != null ? String(p.garageType) : undefined,
    stories: num(p.stories) ?? undefined,
    basement: p.basementType != null ? String(p.basementType) : undefined,
  };
}

/** Fetch Realie Premium Comparables by lat/lng. Returns mapped comps array. */
async function fetchRealieComparables(
  lat: number,
  lng: number,
  opts?: { radius?: number; timeFrame?: number; maxResults?: number; subjectSpecs?: SubjectSpecs }
): Promise<Array<Record<string, unknown>>> {
  const apiKey = getRealieKey();
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const params = new URLSearchParams();
  params.set("latitude", String(lat));
  params.set("longitude", String(lng));
  params.set("radius", String(opts?.radius ?? 1));
  params.set("timeFrame", String(opts?.timeFrame ?? 12));
  params.set("maxResults", String(Math.min(opts?.maxResults ?? 50, 50)));

  // Optional filters from subjectSpecs
  if (opts?.subjectSpecs?.bedrooms != null) {
    const beds = Math.floor(opts.subjectSpecs.bedrooms);
    // Allow ±1 bed for broader matches
    params.set("bedsMin", String(Math.max(1, beds - 1)));
    params.set("bedsMax", String(beds + 1));
  }
  if (opts?.subjectSpecs?.bathrooms != null) {
    const baths = opts.subjectSpecs.bathrooms;
    params.set("bathsMin", String(Math.max(1, Math.floor(baths - 1))));
    params.set("bathsMax", String(Math.ceil(baths + 1)));
  }

  const url = `${REALIE_BASE}/public/premium/comparables/?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "Authorization": apiKey, "Accept": "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    const errText = await res.text().catch(() => "");
    console.warn(`Realie comparables failed (${res.status}): ${errText}`);
    return [];
  }
  const data = await res.json();
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const list = Array.isArray(d.comparables) ? d.comparables : Array.isArray(d) ? d : [];
  return list.map((item: unknown) => mapRealieToComp(item as Record<string, unknown>)).filter(Boolean) as Array<Record<string, unknown>>;
}

// ── RentCast Comparables ──────────────────────────────────────────────────────

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
  const yearBuilt = p.yearBuilt ?? p.year_built ?? p.YearBuilt;
  const lat = p.latitude ?? p.lat;
  const lng = p.longitude ?? p.lng ?? p.lon;
  const dist = p.distance ?? p.distance_in_miles ?? p.distanceMiles ?? p.milesFromSubject ?? p.distanceFromSubject;
  const domVal = p.daysOnMarket ?? p.dom ?? p.days_on_market ?? p.listingAge ?? lastSale?.daysOnMarket ?? lastSale?.dom;
  return {
    address: a,
    salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
    saleDate: saleDate ? String(saleDate).slice(0, 10) : undefined,
    dom: domVal,
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
    yearBuilt: yearBuilt != null ? Number(yearBuilt) : undefined,
    latitude: lat != null && Number.isFinite(Number(lat)) ? Number(lat) : undefined,
    longitude: lng != null && Number.isFinite(Number(lng)) ? Number(lng) : undefined,
    distance: dist != null && Number.isFinite(Number(dist)) ? Number(dist) : undefined,
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
  const yearBuilt = item.yearBuilt ?? item.year_built ?? item.YearBuilt;
  const lat = item.latitude ?? item.lat;
  const lng = item.longitude ?? item.lng ?? item.lon;
  const dist = item.distance ?? item.distance_in_miles ?? item.distanceMiles ?? item.milesFromSubject ?? item.distanceFromSubject;
  const domVal = item.daysOnMarket ?? item.dom ?? item.days_on_market ?? item.listingAge;
  return {
    address: a,
    salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
    saleDate: saleDate || undefined,
    dom: domVal,
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
    yearBuilt: yearBuilt != null ? Number(yearBuilt) : undefined,
    latitude: lat != null && Number.isFinite(Number(lat)) ? Number(lat) : undefined,
    longitude: lng != null && Number.isFinite(Number(lng)) ? Number(lng) : undefined,
    distance: dist != null && Number.isFinite(Number(dist)) ? Number(dist) : undefined,
  };
}

async function fetchRentCastCompsFromListings(
  address: string,
  zipCode: string,
  limit: number,
  opts?: { bedrooms?: string; bathrooms?: string; fullAddress?: string }
): Promise<Array<Record<string, unknown>>> {
  const apiKey = getRentCastKey();
  if (!apiKey) return [];
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const cutoffMs = twelveMonthsAgo.getTime();
  const params = new URLSearchParams();
  const addrParam = opts?.fullAddress && opts.fullAddress.trim() ? opts.fullAddress.trim() : address;
  if (addrParam) params.set("address", addrParam);
  if (zipCode) params.set("zipCode", zipCode);
  params.set("limit", String(Math.min(limit, 50)));
  if (opts?.bedrooms) params.set("bedrooms", opts.bedrooms);
  if (opts?.bathrooms) params.set("bathrooms", opts.bathrooms);
  const url = `${RENTCAST_BASE}/listings/sale?${params.toString()}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.listings ?? data?.comps ?? data?.data ?? [];
  const mapped = list.map(mapRentCastToComp).filter(Boolean) as Array<Record<string, unknown>>;
  const nowMs = Date.now();
  const within12mo = mapped.filter((c) => {
    const ts = parseSaleDate(c.saleDate ?? c.soldDate);
    if (ts > nowMs) return false;
    if (ts === 0) return true;
    return ts >= cutoffMs;
  });
  const usable = within12mo.length > 0 ? within12mo : mapped.filter((c) => {
    const ts = parseSaleDate(c.saleDate ?? c.soldDate);
    return ts === 0 || ts <= nowMs;
  });
  usable.sort((a, b) => parseSaleDate(b.saleDate ?? b.soldDate) - parseSaleDate(a.saleDate ?? a.soldDate));
  return usable.slice(0, limit);
}

async function fetchRentCastCompsFromProperties(
  zipCode: string,
  limit: number,
  opts?: { fullAddress?: string; city?: string; state?: string; bedrooms?: string; bathrooms?: string }
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
    params.set("limit", String(Math.min(limit, 50)));
    if (opts?.bedrooms) params.set("bedrooms", opts.bedrooms);
    if (opts?.bathrooms) params.set("bathrooms", opts.bathrooms);
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

/** Normalize AVM subject/property object to a minimal shape for comparison (address, squareFootage, bedrooms, bathrooms, yearBuilt, lat/lng for distance). */
function mapAvmSubject(p: Record<string, unknown> | null): Record<string, unknown> | undefined {
  if (!p || typeof p !== "object") return undefined;
  const num = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);
  const str = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : undefined);
  const addressStr = str(p.formattedAddress ?? p.address ?? p.streetAddress ?? p.street_address ?? p.line1);
  const sqft = num(p.squareFootage ?? p.square_footage ?? p.sqft);
  const beds = p.bedrooms ?? p.beds;
  const baths = p.bathrooms ?? p.baths;
  const yearBuilt = num(p.yearBuilt ?? p.year_built ?? p.YearBuilt);
  const lat = num(p.latitude ?? p.lat);
  const lng = num(p.longitude ?? p.lng ?? p.lon);
  if (!addressStr && sqft == null && beds == null && baths == null && yearBuilt == null && lat == null && lng == null) return undefined;
  const out: Record<string, unknown> = {};
  if (addressStr) out.address = addressStr;
  if (sqft != null && Number.isFinite(sqft)) out.squareFootage = sqft;
  if (beds != null) out.bedrooms = beds;
  if (baths != null) out.bathrooms = baths;
  if (yearBuilt != null && Number.isFinite(yearBuilt)) out.yearBuilt = yearBuilt;
  if (lat != null && Number.isFinite(lat)) out.latitude = lat;
  if (lng != null && Number.isFinite(lng)) out.longitude = lng;
  return Object.keys(out).length ? out : undefined;
}

type AvmCompsResult = {
  comparables: Array<Record<string, unknown>>;
  avmValue?: number;
  avmSubject?: Record<string, unknown>;
  avmResponseKeys?: string[];
};

async function fetchRentCastCompsFromAvmValue(address: string, zipCode: string): Promise<AvmCompsResult> {
  const apiKey = getRentCastKey();
  if (!apiKey) return { comparables: [] };
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (zipCode) params.set("zipCode", zipCode);
  const url = `${RENTCAST_BASE}/avm/value?${params.toString()}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return { comparables: [] };
  const data = await res.json();
  if (!data || typeof data !== "object") return { comparables: [] };
  const d = data as Record<string, unknown>;
  const comparables = Array.isArray(d.comparables) ? d.comparables
    : Array.isArray(d.comps) ? d.comps
    : Array.isArray(d.comparableSales) ? d.comparableSales
    : Array.isArray((d as Record<string, unknown>).comparable_sales) ? (d as Record<string, unknown>).comparable_sales as unknown[]
    : [];
  const mapped = comparables
    .map((item: unknown) => mapRentCastToComp(item as Record<string, unknown>))
    .filter(Boolean) as Array<Record<string, unknown>>;

  const rawValue = d.value ?? d.price ?? d.avmValue ?? d.estimatedValue;
  const avmValue = rawValue != null && rawValue !== "" ? Number(rawValue) : undefined;
  const numAvm = typeof avmValue === "number" && Number.isFinite(avmValue) ? avmValue : undefined;

  const rawSubject = d.property ?? d.subject ?? d.subjectProperty;
  const subjectObj = rawSubject && typeof rawSubject === "object" && !Array.isArray(rawSubject) ? (rawSubject as Record<string, unknown>) : null;
  const avmSubject = subjectObj ? mapAvmSubject(subjectObj) : undefined;
  const avmResponseKeys = mapped.length === 0 ? Object.keys(d) : undefined;

  return { comparables: mapped, avmValue: numAvm, avmSubject, avmResponseKeys };
}

type CompsFetchResult = {
  comps: Array<Record<string, unknown>>;
  source: "realie" | "avm" | "listings" | "properties";
  avmValue?: number;
  avmSubject?: Record<string, unknown>;
  avmResponseKeys?: string[];
};

async function fetchRentCastComps(
  address: string,
  zipCode: string,
  limit: number,
  opts?: { fullAddress?: string; city?: string; state?: string; subjectSpecs?: SubjectSpecs }
): Promise<CompsFetchResult> {
  const avm = await fetchRentCastCompsFromAvmValue(address, zipCode);
  if (avm.comparables.length > 0) {
    return { comps: avm.comparables.slice(0, limit), source: "avm", avmValue: avm.avmValue, avmSubject: avm.avmSubject };
  }
  const listings = await fetchRentCastCompsFromListings(address, zipCode, limit, { fullAddress: opts?.fullAddress });
  if (listings.length > 0) return { comps: listings, source: "listings", avmValue: avm.avmValue, avmSubject: avm.avmSubject, avmResponseKeys: avm.avmResponseKeys };
  const props = await fetchRentCastCompsFromProperties(zipCode, limit, opts);
  return { comps: props, source: "properties", avmValue: avm.avmValue, avmSubject: avm.avmSubject, avmResponseKeys: avm.avmResponseKeys };
}

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
  return mapRentCastToComp(record);
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
    const { address, zipCode, city, state, subjectSpecs } = validation;
    const userId = String(body?.userId ?? body?.user_id ?? "").trim();
    const propertyId = String(body?.propertyId ?? body?.property_id ?? "").trim() || undefined;
    const subjectAddress = String(body?.subjectAddress ?? body?.subject_address ?? body?.address ?? "").trim() || undefined;
    const debugRequested = body?.debug === true;

    // lat/lng passed from property response (required for Realie comps)
    const subjectLat = body?.lat != null && Number.isFinite(Number(body.lat)) ? Number(body.lat) : undefined;
    const subjectLng = body?.lng != null && Number.isFinite(Number(body.lng)) ? Number(body.lng) : undefined;

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const usage = userId ? await getUsage(supabase, userId, ym) : { realie_count: 0, rentcast_count: 0 };

    const realieAllowed = !userId || usage.realie_count + 1 <= REALIE_LIMIT;
    const rentcastAllowed = !userId || usage.rentcast_count + 3 <= RENTCAST_LIMIT;

    let recentComps: Array<Record<string, unknown>> = [];
    let subjectSaleListing: Record<string, unknown> | null = null;
    let avmValue: number | undefined;
    let avmSubject: Record<string, unknown> | undefined;
    const errors: string[] = [];
    let compsSource = "unknown";
    let debugComps: { fetchSource?: string; compsRawCount: number; notSubjectCount: number; recentCompsCount: number; avmResponseKeys?: string[] } | null = null;

    const fullAddress = buildFullAddress({ address, zipCode, city, state });

    // ── Realie Premium Comparables (primary source) ──────────────────────────
    // Requires lat/lng. If not provided, skip to RentCast fallback.
    if (getRealieKey() && realieAllowed && subjectLat != null && subjectLng != null) {
      try {
        const rawComps = await fetchRealieComparables(subjectLat, subjectLng, {
          radius: 1,
          timeFrame: 12,
          maxResults: COMPS_RESPONSE_LIMIT,
          subjectSpecs,
        });

        if (rawComps.length > 0) {
          if (userId) await incrementUsage(supabase, userId, ym, "realie");

          // Filter out subject property
          const notSubject = rawComps.filter((c) => !isSubjectComp(c, subjectAddress, propertyId));

          // Compute distances using subject lat/lng
          for (const c of notSubject) {
            if (c.distance != null && Number.isFinite(Number(c.distance))) continue;
            const clat = c.latitude != null && Number.isFinite(Number(c.latitude)) ? Number(c.latitude) : undefined;
            const clng = c.longitude != null && Number.isFinite(Number(c.longitude)) ? Number(c.longitude) : undefined;
            if (clat != null && clng != null) {
              const miles = computeDistanceFromCoords(subjectLat, subjectLng, clat, clng);
              if (Number.isFinite(miles)) c.distance = Math.round(miles * 100) / 100;
            }
          }

          // Filter to recent (within 12 months) and non-future
          const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
          const nowMs = Date.now();
          const recentOnly = notSubject.filter((c) => {
            const saleMs = parseSaleDate(c.saleDate ?? c.soldDate);
            if (saleMs === 0) return true;
            if (saleMs > nowMs) return false;
            return saleMs >= oneYearAgoMs;
          });
          recentComps = recentOnly.length > 0
            ? recentOnly.slice(0, COMPS_RESPONSE_LIMIT)
            : notSubject.filter((c) => !isSaleDateInFuture(c)).slice(0, COMPS_RESPONSE_LIMIT);
          compsSource = "Realie";

          if (debugRequested || recentComps.length === 0) {
            debugComps = {
              fetchSource: "realie",
              compsRawCount: rawComps.length,
              notSubjectCount: notSubject.length,
              recentCompsCount: recentComps.length,
            };
          }
        }
      } catch (e) {
        console.error("Realie comps fetch error:", e);
        errors.push("Realie comps: " + (e as Error).message);
      }
    } else if (getRealieKey() && realieAllowed && (subjectLat == null || subjectLng == null)) {
      errors.push("Realie comps require lat/lng coordinates (fetch property details first to obtain them).");
    } else if (getRealieKey() && userId && !realieAllowed) {
      errors.push(`Realie monthly limit (${REALIE_LIMIT}) reached.`);
    }

    // ── RentCast fallback ────────────────────────────────────────────────────
    if (recentComps.length === 0 && getRentCastKey() && rentcastAllowed) {
      try {
        const fetchResult = await fetchRentCastComps(address, zipCode, COMPS_RESPONSE_LIMIT, {
          fullAddress,
          city,
          state,
          subjectSpecs,
        });
        const compsRaw = fetchResult.comps;
        const fetchSource = fetchResult.source;
        avmValue = fetchResult.avmValue;
        avmSubject = fetchResult.avmSubject;

        const notSubject = compsRaw.filter((c) => !isSubjectComp(c, subjectAddress, propertyId));

        const rcSubjectLat = avmSubject?.latitude != null && Number.isFinite(Number(avmSubject.latitude)) ? Number(avmSubject.latitude) : subjectLat;
        const rcSubjectLng = avmSubject?.longitude != null && Number.isFinite(Number(avmSubject.longitude)) ? Number(avmSubject.longitude) : subjectLng;
        if (rcSubjectLat != null && rcSubjectLng != null) {
          for (const c of notSubject) {
            if (c.distance != null && Number.isFinite(Number(c.distance))) continue;
            const clat = c.latitude != null && Number.isFinite(Number(c.latitude)) ? Number(c.latitude) : undefined;
            const clng = c.longitude != null && Number.isFinite(Number(c.longitude)) ? Number(c.longitude) : undefined;
            if (clat != null && clng != null) {
              const miles = computeDistanceFromCoords(rcSubjectLat, rcSubjectLng, clat, clng);
              if (Number.isFinite(miles)) c.distance = Math.round(miles * 100) / 100;
            }
          }
        }

        const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const recentOnly = notSubject.filter((c) => {
          const saleMs = parseSaleDate(c.saleDate ?? c.soldDate);
          if (saleMs === 0) return true;
          if (saleMs > nowMs) return false;
          return saleMs >= oneYearAgoMs;
        });
        recentComps = recentOnly.length > 0 ? recentOnly.slice(0, COMPS_RESPONSE_LIMIT) : notSubject.filter((c) => !isSaleDateInFuture(c)).slice(0, COMPS_RESPONSE_LIMIT);
        compsSource = "RentCast";

        if (recentComps.length === 0 && propertyId) {
          const subject = await fetchRentCastSaleListingById(propertyId);
          if (subject && !isSaleDateInFuture(subject)) {
            subjectSaleListing = subject;
            if (userId) await incrementUsage(supabase, userId, ym, "rentcast");
          }
        }
        if (userId) await incrementUsage(supabase, userId, ym, "rentcast");
        if (debugRequested || recentComps.length === 0) {
          debugComps = { fetchSource, compsRawCount: compsRaw.length, notSubjectCount: notSubject.length, recentCompsCount: recentComps.length };
          if (fetchResult.avmResponseKeys) debugComps.avmResponseKeys = fetchResult.avmResponseKeys;
        }
      } catch (e) {
        console.error("RentCast comps fetch error:", e);
        errors.push("RentCast comps: " + (e as Error).message);
      }
    } else if (recentComps.length === 0 && userId && !rentcastAllowed && !getRealieKey()) {
      errors.push(`RentCast monthly limit (${RENTCAST_LIMIT}) reached.`);
    }

    if (recentComps.length === 0 && !errors.some((e) => e.includes("comps"))) {
      if (getRealieKey() || getRentCastKey()) {
        errors.push("No comparable sales found for this address or area.");
      } else {
        errors.push("No property API key configured (REALIE_API_KEY or RENTCAST_API_KEY required).");
      }
    }

    const result: Record<string, unknown> = {
      recentComps,
      source: compsSource,
    };
    if (subjectSaleListing != null) result.subjectSaleListing = subjectSaleListing;
    if (avmValue != null) result.avmValue = avmValue;
    if (avmSubject != null) result.avmSubject = avmSubject;
    if (debugRequested) {
      result._debug = { address, zipCode, city: city ?? null, state: state ?? null, propertyId: propertyId ?? null, subjectAddress: subjectAddress ?? null, fullAddress, subjectLat: subjectLat ?? null, subjectLng: subjectLng ?? null, realieKeyPresent: !!getRealieKey(), rentcastKeyPresent: !!getRentCastKey() };
    }
    if (debugComps) result._debugComps = debugComps;
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
        realie_limit: REALIE_LIMIT,
        rentcast_limit: RENTCAST_LIMIT,
      };
    }
    if (errors.length) result.warnings = errors;
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});
