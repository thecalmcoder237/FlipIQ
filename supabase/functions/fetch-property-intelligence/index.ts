/** Deno global provided by Supabase Edge Runtime */
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

// npm: specifier is resolved at runtime by Supabase Edge/Deno (no types in this repo)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Deno resolves npm:@supabase/supabase-js@2 at runtime
import { createClient } from "npm:@supabase/supabase-js@2";

// Inlined CORS and Supabase admin (single file for deploy bundle)
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
/** Up to 2 RentCast calls per request (property search, optional property by id); limit is per month. Comps come from fetch-comps only. */
const RENTCAST_LIMIT = 50;
/** Realie free tier: 25/month. Adjust if on a paid plan. */
const REALIE_LIMIT = 25;

/** Normalize and validate request data before calling APIs. Returns 400 if invalid. */
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

function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getRentCastKey(): string | null {
  return Deno.env.get("RENTCAST_API_KEY")?.trim() || null;
}

function getRealieKey(): string | null {
  return Deno.env.get("REALIE_API_KEY")?.trim() || null;
}

/**
 * Extract just the street address from a full address string.
 * Realei requires street-only in the address param (e.g. "123 Main St", not "123 Main St, City, ST 12345").
 */
function extractStreetAddress(fullAddress: string): string {
  const commaIdx = fullAddress.indexOf(",");
  if (commaIdx > 0) return fullAddress.substring(0, commaIdx).trim();
  return fullAddress.trim();
}

/** Map Realie property response to our normalized property schema. */
function mapRealieToProperty(p: Record<string, unknown> | null): Record<string, unknown> {
  if (!p || typeof p !== "object") return {};
  const num = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);
  const str = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : undefined);

  // Coordinates: Realie returns top-level lat/lng or in `location.coordinates: [lng, lat]`
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

  // Full address: Realie's fullAddress field or construct from parts
  const fullAddr = str(p.fullAddress) ?? str(p.addressWithUnit) ?? str(p.address);
  const cityStr = str(p.city);
  const stateStr = str(p.state);
  const zipStr = str(p.zipCode);
  const addressStr = fullAddr ?? [str(p.address), cityStr, stateStr, zipStr].filter(Boolean).join(", ");

  // Sale history from transfers array
  const transfers = Array.isArray(p.transfers) ? p.transfers : [];
  const lastTransfer = transfers.length ? (transfers[0] as Record<string, unknown>) : null;
  const lastSalePrice = num(p.transferPrice ?? lastTransfer?.transferPrice ?? 0);
  const lastSaleDateRaw = p.transferDateObject ?? p.transferDate ?? lastTransfer?.transferDateObject ?? lastTransfer?.transferDate;
  const lastSaleDate = lastSaleDateRaw ? String(lastSaleDateRaw).slice(0, 10) : undefined;

  // Map Realie useCode to a readable property type
  const useCode = p.useCode != null ? String(p.useCode) : undefined;
  const propertyTypeStr = mapRealieUseCode(useCode);

  const base: Record<string, unknown> = {
    address: addressStr || undefined,
    streetAddress: str(p.address) ?? str(p.streetLine1) ?? undefined,
    city: cityStr ?? undefined,
    state: stateStr ?? undefined,
    zipCode: zipStr ?? undefined,
    county: str(p.county) ?? undefined,
    yearBuilt: num(p.yearBuilt) ?? undefined,
    squareFootage: num(p.buildingArea) ?? undefined,
    bedrooms: p.totalBedrooms ?? undefined,
    bathrooms: p.totalBathrooms ?? undefined,
    propertyType: propertyTypeStr ?? useCode ?? undefined,
    zoning: str(p.zoningCode ?? p.zoning) ?? undefined,
    annualPropertyTaxes: num(p.lastTaxAmount) ?? undefined,
    assessedValue: num(p.lastAssessedValue ?? p.lastMarketValue) ?? undefined,
    parcelId: str(p.apn) ?? undefined,
    propertyId: str(p.siteId ?? p.apn) ?? undefined,
    latitude: lat != null && Number.isFinite(lat) ? lat : undefined,
    longitude: lng != null && Number.isFinite(lng) ? lng : undefined,
    lastSalePrice: lastSalePrice != null && Number.isFinite(lastSalePrice) && lastSalePrice > 0 ? lastSalePrice : undefined,
    lastSaleDate: lastSaleDate ?? undefined,
    // Additional Realie fields
    stories: num(p.stories) ?? undefined,
    pool: p.pool != null ? Boolean(p.pool) : undefined,
    garage: p.garage != null ? Boolean(p.garage) : undefined,
    garageCount: num(p.garageCount) ?? undefined,
    garageType: str(p.garageType) ?? undefined,
    fireplaceCount: num(p.fireplaceCount) ?? undefined,
    basement: p.basementType != null ? String(p.basementType) : undefined,
    roofType: str(p.roofType) ?? undefined,
    constructionType: str(p.constructionType) ?? undefined,
    neighborhood: str(p.neighborhood) ?? undefined,
    subdivision: str(p.subdivision) ?? undefined,
    acres: num(p.acres) ?? undefined,
    landArea: num(p.landArea) ?? undefined,
    modelValue: num(p.modelValue) ?? undefined,
    modelValueMin: num(p.modelValueMin) ?? undefined,
    modelValueMax: num(p.modelValueMax) ?? undefined,
  };

  // Attach transfer history mapped to RentCast-style history for compatibility
  if (transfers.length > 0) {
    base.history = transfers.map((t: unknown) => {
      const tr = t as Record<string, unknown>;
      return {
        date: tr.transferDateObject ?? tr.transferDate,
        saleDate: tr.transferDateObject ?? tr.transferDate,
        price: tr.transferPrice,
        salePrice: tr.transferPrice,
        grantee: tr.grantee,
        grantor: tr.grantor,
      };
    });
  }

  if (Array.isArray(p.assessments) && p.assessments.length > 0) {
    base.assessments = p.assessments;
  }

  // Remove undefined keys
  return Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined));
}

/** Map Realie use code to a human-readable property type string. */
function mapRealieUseCode(useCode: string | undefined): string | undefined {
  if (!useCode) return undefined;
  const code = parseInt(useCode, 10);
  if (isNaN(code)) return useCode;
  // Common residential use codes
  if (code >= 1000 && code <= 1099) return "Single-Family";
  if (code >= 1100 && code <= 1199) return "Condo";
  if (code >= 1200 && code <= 1299) return "Townhouse";
  if (code >= 1300 && code <= 1399) return "Multi-Family";
  if (code >= 1400 && code <= 1499) return "Mobile Home";
  if (code >= 2000 && code <= 2999) return "Commercial";
  if (code >= 3000 && code <= 3999) return "Industrial";
  if (code >= 4000 && code <= 4999) return "Agricultural";
  if (code >= 5000 && code <= 5999) return "Vacant Land";
  return undefined;
}

/** Fetch property from Realie address lookup endpoint. */
async function fetchRealieProperty(
  streetAddress: string,
  state: string,
  opts?: { county?: string; city?: string }
): Promise<{ property: Record<string, unknown>; callsUsed: number }> {
  const apiKey = getRealieKey();
  if (!apiKey || !state || state.length < 2) return { property: {}, callsUsed: 0 };

  const params = new URLSearchParams();
  params.set("state", state.slice(0, 2).toUpperCase());
  params.set("address", streetAddress);
  if (opts?.county) params.set("county", opts.county.toUpperCase());
  if (opts?.city) params.set("city", opts.city.toUpperCase());

  const url = `${REALIE_BASE}/public/property/address/?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "Authorization": apiKey, "Accept": "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) return { property: {}, callsUsed: 1 };
    const errText = await res.text().catch(() => "");
    console.warn(`Realie property lookup failed (${res.status}): ${errText}`);
    return { property: {}, callsUsed: 1 };
  }
  const data = await res.json();
  if (!data || typeof data !== "object") return { property: {}, callsUsed: 1 };
  const d = data as Record<string, unknown>;
  // Realie returns { property: {...} } for address lookup
  const record = (d.property && typeof d.property === "object" ? d.property : d) as Record<string, unknown>;
  const mapped = mapRealieToProperty(record);
  return { property: mapped, callsUsed: 1 };
}

/** Fetch full property record by id (GET /v1/properties/{id}). Returns { mapped, raw } API record. */
async function fetchRentCastPropertyById(id: string): Promise<{ mapped: Record<string, unknown>; raw: Record<string, unknown> | null }> {
  const apiKey = getRentCastKey();
  if (!apiKey || !id) return { mapped: {}, raw: null };
  const url = `${RENTCAST_BASE}/properties/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return { mapped: {}, raw: null };
  const data = await res.json();
  if (!data || typeof data !== "object") return { mapped: {}, raw: null };
  const d = data as Record<string, unknown>;
  const record =
    (d.data && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : null) ??
    (d.property && typeof d.property === "object" ? d.property : null) ??
    d;
  return { mapped: mapRentCastToProperty(record as Record<string, unknown>), raw: record as Record<string, unknown> };
}

/**
 * Build RentCast full address per docs: "Street, City, State, Zip" (e.g. "5500 Grand Lake Dr, San Antonio, TX, 78244").
 * City and state are case-sensitive; state must be 2-character abbreviation.
 */
function buildRentCastAddress(opts: {
  street: string;
  zipCode: string;
  city?: string;
  state?: string;
}): string {
  const { street, zipCode, city, state } = opts;
  const stateNorm = state?.trim().slice(0, 2).toUpperCase() || undefined;
  const parts = [street.trim(), city?.trim(), stateNorm, zipCode].filter(Boolean);
  return parts.join(", ");
}

/** Fetch property from RentCast: search by full address (Street, City, State, Zip) per docs, then optionally full record by id. */
async function fetchRentCastProperty(
  fullAddress: string,
  zipCode: string,
  opts?: { city?: string; state?: string }
): Promise<{ property: Record<string, unknown>; rawRentCastRecord: Record<string, unknown> | null; callsUsed: number }> {
  const apiKey = getRentCastKey();
  if (!apiKey) return { property: {}, rawRentCastRecord: null, callsUsed: 0 };
  const params = new URLSearchParams();
  if (fullAddress) params.set("address", fullAddress);
  if (zipCode) params.set("zipCode", zipCode);
  if (opts?.city) params.set("city", opts.city.trim());
  if (opts?.state) params.set("state", opts.state.trim().slice(0, 2).toUpperCase());
  params.set("limit", "1");
  const url = `${RENTCAST_BASE}/properties?${params.toString()}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) return { property: {}, rawRentCastRecord: null, callsUsed: 1 };
  const data = await res.json();
  if (!data || typeof data !== "object") return { property: {}, rawRentCastRecord: null, callsUsed: 1 };
  const d = data as Record<string, unknown>;
  let list: unknown[] = Array.isArray(d) ? d : Array.isArray(d.properties) ? d.properties : Array.isArray(d.listings) ? d.listings : Array.isArray(d.data) ? d.data : Array.isArray(d.results) ? d.results : [];
  if (list.length === 0 && d.property && typeof d.property === "object") list = [d.property];
  if (list.length === 0 && d.data && typeof d.data === "object" && !Array.isArray(d.data)) list = [d.data];
  const first = list.length ? (list[0] as Record<string, unknown>) : null;
  let callsUsed = 1;
  if (first && typeof first.id === "string" && first.id.trim()) {
    const { mapped, raw } = await fetchRentCastPropertyById(first.id.trim());
    if (mapped && Object.keys(mapped).length > 0) {
      return { property: mapped, rawRentCastRecord: raw, callsUsed: 2 };
    }
  }
  return { property: mapRentCastToProperty(first), rawRentCastRecord: first, callsUsed: 1 };
}

function mapRentCastToProperty(p: Record<string, unknown> | null): Record<string, unknown> {
  if (!p || typeof p !== "object") return {};
  const num = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);
  const str = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : undefined);
  const addressStr = str(p.formattedAddress ?? p.address ?? p.streetAddress ?? p.street_address ?? p.line1);
  const cityStr = str(p.city ?? p.City);
  const stateStr = str(p.state ?? p.State);
  const zipStr = str(p.zipCode ?? p.zip_code ?? p.zip ?? p.postalCode ?? p.postal_code);
  const lat = num(p.latitude ?? p.lat);
  const lng = num(p.longitude ?? p.lng ?? p.lon);
  const base: Record<string, unknown> = {
    address: addressStr ?? undefined,
    streetAddress: addressStr ?? str(p.streetAddress ?? p.street_address) ?? undefined,
    city: cityStr ?? undefined,
    state: stateStr ?? undefined,
    zipCode: zipStr ?? undefined,
    yearBuilt: num(p.yearBuilt ?? p.year_built ?? p.YearBuilt) ?? undefined,
    squareFootage: num(p.squareFootage ?? p.square_footage ?? p.sqft ?? p.SquareFootage) ?? undefined,
    bedrooms: p.bedrooms ?? p.beds ?? p.Bedrooms,
    bathrooms: p.bathrooms ?? p.baths ?? p.Bathrooms,
    propertyType: str(p.propertyType ?? p.property_type ?? p.useCode ?? p.UseCode) ?? undefined,
    schoolDistrict: str(p.schoolDistrict ?? p.school_district) ?? undefined,
    zoning: str(p.zoning ?? p.Zoning) ?? undefined,
    county: str(p.county ?? p.County) ?? undefined,
    annualPropertyTaxes: num(p.annualPropertyTaxes ?? p.annual_property_taxes ?? p.taxAmount ?? p.TaxAmount ?? p.tax ?? p.propertyTax ?? p.annualTax ?? p.totalTax) ?? undefined,
    assessedValue: num(p.assessedValue ?? p.assessed_value ?? p.taxAssessedValue ?? p.tax_assessed_value ?? p.assessmentValue ?? p.taxAssessment) ?? undefined,
    parcelId: str(p.parcelId ?? p.parcel_id ?? p.parcelNumber ?? p.ParcelNumber) ?? undefined,
    propertyId: str(p.id ?? p.parcelId ?? p.parcel_id ?? p.propertyId ?? p.property_id) ?? undefined,
    latitude: Number.isFinite(lat) ? lat : undefined,
    longitude: Number.isFinite(lng) ? lng : undefined,
    lastSalePrice: num(p.lastSalePrice ?? p.last_sale_price) ?? undefined,
    lastSaleDate: str(p.lastSaleDate ?? p.last_sale_date) ?? undefined,
  };
  if (Array.isArray(p.history) && p.history.length) base.history = p.history;
  const known = new Set([
    "address", "streetAddress", "city", "state", "zipCode", "yearBuilt", "squareFootage", "bedrooms", "bathrooms",
    "propertyType", "schoolDistrict", "zoning", "county", "annualPropertyTaxes", "parcelId", "propertyId",
    "latitude", "longitude", "lastSalePrice", "lastSaleDate", "history",
    "formattedAddress", "street_address", "year_built", "square_footage", "zip_code", "postalCode", "postal_code",
    "property_type", "school_district", "parcel_id", "parcelNumber", "property_id", "last_sale_price", "last_sale_date",
    "assessedValue", "assessed_value", "taxAssessedValue", "tax_assessed_value", "assessmentValue", "taxAssessment",
  ]);
  for (const key of Object.keys(p)) {
    if (known.has(key)) continue;
    const v = p[key];
    if (v !== undefined && v !== null) base[key] = v;
  }
  return base;
}

/** Get or create api_usage row for user + month. */
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

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = validateAndNormalize(body);
    if (!validation.valid) {
      return json({ error: validation.error }, { status: 400 });
    }
    const { address, zipCode, city, state: stateFromBody } = validation;
    const userId = String(body?.userId ?? body?.user_id ?? "").trim();
    const lat = body?.lat != null ? Number(body.lat) : undefined;
    const lng = body?.lng != null ? Number(body.lng) : undefined;
    const county = (body?.county != null && body?.county !== "") ? String(body.county).trim() : undefined;
    const propertyId = String(body?.propertyId ?? body?.property_id ?? "").trim() || undefined;
    const debugRequested = body?.debug === true;
    const streetOnly = extractStreetAddress(address);

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const usage = userId ? await getUsage(supabase, userId, ym) : { realie_count: 0, rentcast_count: 0 };

    const realieAllowed = !userId || usage.realie_count + 1 <= REALIE_LIMIT;
    /** Up to 2 RentCast calls per request (property search, optional property by id). Comps come from fetch-comps only. */
    const rentcastAllowed = !userId || usage.rentcast_count + 2 <= RENTCAST_LIMIT;

    let property: Record<string, unknown> = {};
    const errors: string[] = [];
    let dataSource = "unknown";
    let rawRentCastRecord: Record<string, unknown> | null = null;

    // ── RentCast first (primary source) ──────────────────────────────────────
    if (getRentCastKey() && rentcastAllowed) {
      try {
        const rentCastOpts = {
          fullAddress: buildRentCastAddress({
            street: address,
            zipCode,
            city: city ?? undefined,
            state: stateFromBody ?? undefined,
          }),
          city: city ?? undefined,
          state: stateFromBody ?? undefined,
        };
        const { property: prop, rawRentCastRecord: raw, callsUsed } = await fetchRentCastProperty(
          rentCastOpts.fullAddress,
          zipCode,
          { city: rentCastOpts.city, state: rentCastOpts.state }
        );
        property = prop;
        rawRentCastRecord = raw ?? null;
        dataSource = "RentCast";
        for (let i = 0; i < callsUsed; i++) {
          if (userId) await incrementUsage(supabase, userId, ym, "rentcast");
        }
      } catch (e) {
        console.error("RentCast property fetch error:", e);
        errors.push("RentCast property: " + (e as Error).message);
      }
    } else if (userId && !rentcastAllowed) {
      errors.push(`RentCast monthly limit (${RENTCAST_LIMIT}) reached.`);
    }

    // ── Realie fallback (only when county AND city are available) ────────────
    const hasCountyAndCity = !!(county && city && county.trim() && city.trim());
    if (Object.keys(property).length === 0 && getRealieKey() && stateFromBody && realieAllowed && hasCountyAndCity) {
      try {
        const { property: prop, callsUsed } = await fetchRealieProperty(streetOnly, stateFromBody, { county, city });
        if (prop && Object.keys(prop).length > 0) {
          property = prop;
          dataSource = "Realie";
          if (userId && callsUsed > 0) {
            for (let i = 0; i < callsUsed; i++) {
              await incrementUsage(supabase, userId, ym, "realie");
            }
          }
        }
      } catch (e) {
        console.error("Realie property fetch error:", e);
        errors.push("Realie property: " + (e as Error).message);
      }
    } else if (Object.keys(property).length === 0 && getRealieKey() && !hasCountyAndCity) {
      errors.push("Realie fallback requires county and city (add them for broader property search).");
    } else if (getRealieKey() && userId && !realieAllowed) {
      errors.push(`Realie monthly limit (${REALIE_LIMIT}) reached.`);
    }

    if (Object.keys(property).length === 0 && !errors.some((e) => e.includes("property fetch"))) {
      if (getRealieKey() || getRentCastKey()) {
        errors.push("Property search returned no results for this address.");
      } else {
        errors.push("No property API key configured (REALIE_API_KEY or RENTCAST_API_KEY required).");
      }
    }

    const result: Record<string, unknown> = {
      ...property,
      source: dataSource,
    };
    if (rawRentCastRecord != null && Object.keys(rawRentCastRecord).length > 0) {
      result.rawRentCastRecord = rawRentCastRecord;
    }
    if (propertyId && !result.propertyId) result.propertyId = propertyId;
    if (debugRequested) {
      result._debug = {
        address,
        streetOnly,
        zipCode,
        city: city ?? null,
        county: county ?? null,
        state: stateFromBody ?? null,
        fullAddress: buildRentCastAddress({ street: address, zipCode, city, state: stateFromBody }),
        subjectPropertyId: property.propertyId ?? property.id ?? propertyId,
        dataSource,
        realieKeyPresent: !!getRealieKey(),
        rentcastKeyPresent: !!getRentCastKey(),
      };
    }
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      if (result.latitude == null) result.latitude = lat;
      if (result.longitude == null) result.longitude = lng;
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
