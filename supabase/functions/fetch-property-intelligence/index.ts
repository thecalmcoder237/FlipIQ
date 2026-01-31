import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

const REALIE_BASE = "https://app.realie.ai/api/public";
const RENTCAST_BASE = "https://api.rentcast.io/v1";
const REALIE_LIMIT = 25;
const RENTCAST_LIMIT = 45;

function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Map US ZIP prefix (first 3 digits) to state code for Realie. */
function stateFromZip(zipCode: string): string {
  const zip = (zipCode || "").replace(/\D/g, "").slice(0, 3);
  const n = parseInt(zip, 10);
  if (!Number.isFinite(n)) return "";
  if (n >= 300 && n <= 319) return "GA";
  if (n >= 320 && n <= 349) return "FL";
  if (n >= 350 && n <= 369) return "AL";
  if (n >= 370 && n <= 385) return "TN";
  if (n >= 386 && n <= 397) return "MS";
  if (n >= 750 && n <= 799) return "TX";
  if (n >= 900 && n <= 966) return "CA";
  if (n >= 600 && n <= 629) return "IL";
  if (n >= 100 && n <= 149) return "NY";
  if (n >= 850 && n <= 865) return "AZ";
  if (n >= 270 && n <= 289) return "NC";
  if (n >= 290 && n <= 299) return "SC";
  if (n >= 400 && n <= 427) return "KY";
  if (n >= 430 && n <= 459) return "OH";
  if (n >= 460 && n <= 479) return "IN";
  if (n >= 480 && n <= 499) return "MI";
  if (n >= 500 && n <= 528) return "IA";
  if (n >= 530 && n <= 549) return "WI";
  if (n >= 550 && n <= 567) return "MN";
  if (n >= 630 && n <= 658) return "MO";
  if (n >= 700 && n <= 714) return "LA";
  if (n >= 720 && n <= 729) return "AR";
  if (n >= 730 && n <= 749) return "OK";
  if (n >= 800 && n <= 816) return "CO";
  if (n >= 840 && n <= 847) return "UT";
  if (n >= 870 && n <= 884) return "NM";
  if (n >= 970 && n <= 979) return "OR";
  if (n >= 980 && n <= 994) return "WA";
  return "";
}

function streetFromAddress(fullAddress: string): string {
  const s = (fullAddress || "").trim();
  const comma = s.indexOf(",");
  return comma > 0 ? s.slice(0, comma).trim() : s;
}

function getRealieKey(): string | null {
  return Deno.env.get("REALIE_API_KEY")?.trim() || null;
}

function getRentCastKey(): string | null {
  return Deno.env.get("RENTCAST_API_KEY")?.trim() || null;
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

/** Increment realie_count or rentcast_count. */
async function incrementUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string,
  type: "realie" | "rentcast"
): Promise<void> {
  const { data: row } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  const realie = ((row?.realie_count ?? 0) as number) + (type === "realie" ? 1 : 0);
  const rentcast = ((row?.rentcast_count ?? 0) as number) + (type === "rentcast" ? 1 : 0);
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

/** Fetch property via Realie Location Search (lat/lng). */
async function fetchRealieByLocation(
  lat: number,
  lng: number,
  radiusMiles: number = 0.2
): Promise<Record<string, unknown>> {
  const apiKey = getRealieKey();
  if (!apiKey) return {};
  const url = `${REALIE_BASE}/property/location/?latitude=${lat}&longitude=${lng}&radius=${Math.min(radiusMiles, 2)}&limit=1`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) return {};
  const data = await res.json();
  const props = data?.properties;
  const p = Array.isArray(props) && props.length ? props[0] : null;
  return mapRealieToProperty(p);
}

/** Fetch property from Realie (address lookup or search). */
async function fetchRealieProperty(
  address: string,
  zipCode: string,
  city?: string,
  county?: string
): Promise<Record<string, unknown>> {
  const apiKey = getRealieKey();
  if (!apiKey) return {};
  const state = stateFromZip(zipCode);
  const street = streetFromAddress(address);

  if (state && street) {
    let url = `${REALIE_BASE}/property/address/?state=${encodeURIComponent(state)}&address=${encodeURIComponent(street)}`;
    if (city && county) {
      url += `&city=${encodeURIComponent(city)}&county=${encodeURIComponent(county)}`;
    }
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) return {};
    const data = await res.json();
    return mapRealieToProperty(data?.property ?? null);
  }

  if (state && (zipCode || address)) {
    const url = `${REALIE_BASE}/property/search/?state=${encodeURIComponent(state)}&limit=1${zipCode ? `&zipCode=${encodeURIComponent(zipCode)}` : ""}${address ? `&address=${encodeURIComponent(street || address)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) return {};
    const data = await res.json();
    const props = data?.properties;
    const p = Array.isArray(props) && props.length ? props[0] : null;
    return mapRealieToProperty(p);
  }

  return {};
}

function mapRealieToProperty(p: Record<string, unknown> | null): Record<string, unknown> {
  if (!p || typeof p !== "object") return {};
  const num = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);
  const str = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : undefined);
  const lat = num(p.latitude ?? p.lat);
  const lng = num(p.longitude ?? p.lng ?? p.lon);
  const addressStr = str(p.address ?? p.streetAddress ?? p.street_address ?? p.line1);
  const cityStr = str(p.city ?? p.City);
  const stateStr = str(p.state ?? p.State);
  const zipStr = str(p.zipCode ?? p.zip_code ?? p.zip ?? p.postalCode ?? p.postal_code);
  return {
    address: addressStr ?? undefined,
    streetAddress: addressStr ?? str(p.streetAddress ?? p.street_address) ?? undefined,
    city: cityStr ?? undefined,
    state: stateStr ?? undefined,
    zipCode: zipStr ?? undefined,
    yearBuilt: num(p.yearBuilt ?? p.year_built ?? p.YearBuilt) ?? undefined,
    squareFootage: num(p.squareFootage ?? p.square_footage ?? p.sqft ?? p.SquareFootage) ?? undefined,
    bedrooms: p.bedrooms ?? p.beds ?? p.Bedrooms,
    bathrooms: p.bathrooms ?? p.baths ?? p.Bathrooms,
    propertyType: str(p.propertyType ?? p.property_type ?? p.UseCode) ?? undefined,
    schoolDistrict: str(p.schoolDistrict ?? p.school_district) ?? undefined,
    zoning: str(p.zoning ?? p.Zoning) ?? undefined,
    county: str(p.county ?? p.County) ?? undefined,
    annualPropertyTaxes: num(p.annualPropertyTaxes ?? p.annual_property_taxes ?? p.TaxAmount ?? p.taxAmount) ?? undefined,
    parcelId: str(p.parcelId ?? p.parcel_id ?? p.ParcelNumber) ?? undefined,
    propertyId: str(p.parcelId ?? p.parcel_id ?? p.ParcelNumber ?? p.propertyId ?? p.property_id) ?? undefined,
    latitude: Number.isFinite(lat) ? lat : undefined,
    longitude: Number.isFinite(lng) ? lng : undefined,
  };
}

/** Parse ISO date string to timestamp for comparison; returns 0 if invalid. */
function parseSaleDate(val: unknown): number {
  if (!val) return 0;
  const s = String(val).trim().slice(0, 10);
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

/** Fetch 5 comps from RentCast: sold within 12 months, most recent first. */
async function fetchRentCastComps(
  address: string,
  zipCode: string,
  limit: number = 5
): Promise<Array<Record<string, unknown>>> {
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
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.listings ?? data?.comps ?? [];
  const mapped = list.map(mapRentCastToComp).filter(Boolean) as Array<Record<string, unknown>>;
  const within12mo = mapped.filter((c) => {
    const ts = parseSaleDate(c.saleDate ?? c.soldDate);
    return ts >= cutoffMs;
  });
  within12mo.sort((a, b) => parseSaleDate(b.saleDate ?? b.soldDate) - parseSaleDate(a.saleDate ?? a.soldDate));
  return within12mo.slice(0, limit);
}

function mapRentCastToComp(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const address = [item.formattedAddress ?? item.address ?? item.streetAddress, item.city, item.state, item.zipCode]
    .filter(Boolean)
    .join(", ");
  const a = (address || String(item.address || item.formattedAddress || "")).trim();
  if (!a) return null;
  const salePrice = Number(item.price ?? item.salePrice ?? item.sale_price ?? item.lastSalePrice ?? 0);
  const saleDate = item.soldDate ?? item.saleDate ?? item.sale_date ?? item.lastSaleDate ?? item.closeDate ?? "";
  const basement = item.basement ?? item.basementType ?? item.basement_type;
  const basementType = item.basementType ?? item.basement_type;
  const basementCondition = item.basementCondition ?? item.basement_condition;
  const parkingType = item.garageType ?? item.garage_type ?? item.parkingType ?? item.parking_type ?? item.carport ?? item.streetParking;
  const parkingSpaces = item.parkingSpaces ?? item.parking_spaces ?? item.garageSpaces ?? item.numberOfParking ?? item.garage_spaces;
  const levels = item.levels ?? item.stories ?? item.numberOfStories ?? item.stories_count;
  return {
    address: a,
    salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
    saleDate: saleDate ? String(saleDate).slice(0, 10) : undefined,
    dom: item.daysOnMarket ?? item.dom ?? item.days_on_market,
    sqft: item.squareFootage ?? item.sqft ?? item.square_footage,
    beds: item.bedrooms ?? item.beds,
    baths: item.bathrooms ?? item.baths,
    basement: basement != null ? String(basement) : undefined,
    basementType: basementType != null ? String(basementType) : undefined,
    basementCondition: basementCondition != null ? String(basementCondition) : undefined,
    parkingType: parkingType != null ? String(parkingType) : undefined,
    parkingSpaces: parkingSpaces != null ? (Number(parkingSpaces) || String(parkingSpaces)) : undefined,
    levels: levels != null ? (Number(levels) || String(levels)) : undefined,
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const address = (body?.address ?? body?.formattedAddress ?? "").trim();
    const zipCode = (body?.zipCode ?? body?.zip_code ?? "").trim().replace(/\D/g, "").slice(0, 5);
    const userId = (body?.userId ?? body?.user_id ?? "").trim();
    const lat = body?.lat != null ? Number(body.lat) : undefined;
    const lng = body?.lng != null ? Number(body.lng) : undefined;
    const city = (body?.city ?? "").trim() || undefined;
    const county = (body?.county ?? "").trim() || undefined;
    const propertyId = (body?.propertyId ?? body?.property_id ?? "").trim() || undefined;

    if (!address) {
      return json({ error: "address is required" }, { status: 400 });
    }
    // Realie Address Lookup requires state (derived from ZIP); enforce 5-digit zipCode
    if (zipCode.length !== 5) {
      return json({ error: "zipCode is required and must be a 5-digit US ZIP (used to derive state for Realie)" }, { status: 400 });
    }
    // Realie: county is required when city is provided
    if (city && !county) {
      return json({ error: "county is required when city is provided (Realie API)" }, { status: 400 });
    }

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const usage = userId ? await getUsage(supabase, userId, ym) : { realie_count: 0, rentcast_count: 0 };
    const realieAllowed = !userId || usage.realie_count < REALIE_LIMIT;
    const rentcastAllowed = !userId || usage.rentcast_count < RENTCAST_LIMIT;

    let property: Record<string, unknown> = {};
    let recentComps: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    if (getRealieKey() && realieAllowed) {
      try {
        if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
          property = await fetchRealieByLocation(lat, lng);
          if (!property || Object.keys(property).length === 0) {
            property = await fetchRealieProperty(address, zipCode, city, county);
          }
        } else {
          property = await fetchRealieProperty(address, zipCode, city, county);
        }
        if (userId && Object.keys(property).length > 0) {
          await incrementUsage(supabase, userId, ym, "realie");
        }
      } catch (e) {
        console.error("Realie fetch error:", e);
        errors.push("Realie: " + (e as Error).message);
      }
    } else if (userId && !realieAllowed) {
      errors.push(`Realie monthly limit (${REALIE_LIMIT}) reached.`);
    }

    // Pull comps after property; use required data from property details when available
    const compAddress = (String(property?.address ?? property?.streetAddress ?? "").trim() || address).trim();
    const compZip = (String(property?.zipCode ?? property?.zip ?? "").trim().replace(/\D/g, "").slice(0, 5) || zipCode);

    if (getRentCastKey() && rentcastAllowed) {
      try {
        recentComps = await fetchRentCastComps(compAddress, compZip, 5);
        if (userId && recentComps.length >= 0) {
          await incrementUsage(supabase, userId, ym, "rentcast");
        }
      } catch (e) {
        console.error("RentCast fetch error:", e);
        errors.push("RentCast: " + (e as Error).message);
      }
    } else if (userId && !rentcastAllowed) {
      errors.push(`RentCast monthly limit (${RENTCAST_LIMIT}) reached.`);
    }

    const result: Record<string, unknown> = {
      ...property,
      recentComps,
      source: "Realie.ai + RentCast",
    };
    if (propertyId && !result.propertyId) result.propertyId = propertyId;
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
