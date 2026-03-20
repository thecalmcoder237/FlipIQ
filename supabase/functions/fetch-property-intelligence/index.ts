declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";
import { RENTCAST_BASE, RENTCAST_LIMIT, getRentCastKey, buildFullAddress } from "../_shared/rentcast.ts";
import { yearMonth, getUsage, incrementUsage } from "../_shared/apiUsage.ts";
import { validateAndNormalize } from "../_shared/validation.ts";

// ---------------------------------------------------------------------------
// Property-specific RentCast helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

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

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const usage = userId ? await getUsage(supabase, userId, ym) : { realie_count: 0, rentcast_count: 0 };
    const rentcastAllowed = !userId || usage.rentcast_count + 2 <= RENTCAST_LIMIT;

    let property: Record<string, unknown> = {};
    const errors: string[] = [];

    const fullAddr = buildFullAddress({
      address,
      zipCode,
      city: city ?? undefined,
      state: stateFromBody ?? undefined,
    });

    let rawRentCastRecord: Record<string, unknown> | null = null;
    
    if (getRentCastKey() && rentcastAllowed) {
      try {
        const { property: prop, rawRentCastRecord: raw, callsUsed } = await fetchRentCastProperty(
          fullAddr,
          zipCode,
          { city: city ?? undefined, state: stateFromBody ?? undefined }
        );
        property = prop;
        rawRentCastRecord = raw ?? null;
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

    if (getRentCastKey() && Object.keys(property).length === 0 && !errors.some((e) => e.includes("property fetch"))) {
      errors.push("Property search returned no results for this address.");
    }

    const result: Record<string, unknown> = {
      ...property,
      source: "RentCast",
    };
    if (rawRentCastRecord != null && Object.keys(rawRentCastRecord).length > 0) {
      result.rawRentCastRecord = rawRentCastRecord;
    }
    if (propertyId && !result.propertyId) result.propertyId = propertyId;
    if (debugRequested) {
      result._debug = { 
        address, 
        zipCode, 
        city: city ?? null, 
        county: county ?? null,
        fullAddress: fullAddr,
        subjectPropertyId: property.propertyId ?? property.id ?? propertyId,
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
