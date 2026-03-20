declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";
import { RENTCAST_BASE, RENTCAST_LIMIT, getRentCastKey, buildFullAddress } from "../_shared/rentcast.ts";
import { yearMonth, getUsage, incrementUsage } from "../_shared/apiUsage.ts";
import { validateAndNormalize, type SubjectSpecs } from "../_shared/validation.ts";

const COMPS_RESPONSE_LIMIT = 50;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseSaleDate(val: unknown): number {
  if (!val) return 0;
  const s = String(val).trim().slice(0, 10);
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function isSaleDateInFuture(comp: Record<string, unknown>): boolean {
  const ms = parseSaleDate(comp.saleDate ?? comp.soldDate);
  return ms > 0 && ms > Date.now();
}

// ---------------------------------------------------------------------------
// Address helpers
// ---------------------------------------------------------------------------

function normalizeAddressForComparison(addr: string | undefined): string {
  if (!addr) return "";
  let normalized = String(addr).toLowerCase().replace(/\s+/g, " ").trim();
  const commaIndex = normalized.indexOf(",");
  if (commaIndex > 0) {
    normalized = normalized.substring(0, commaIndex).trim();
  }
  normalized = normalized.replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way|place|pl)\b\.?$/gi, "").trim();
  return normalized;
}

function looksLikeStreetAddress(norm: string): boolean {
  return norm.length >= 10 && /^\d/.test(norm);
}

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

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Comp mapping helpers
// ---------------------------------------------------------------------------

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

function isActiveListing(item: Record<string, unknown>): boolean {
  const status = String(item.status ?? item.listingStatus ?? item.mls_status ?? "").toLowerCase();
  if (status && (status.includes("active") || status.includes("for sale") || status.includes("listed") || status.includes("new"))) return true;
  if (status && (status.includes("sold") || status.includes("closed") || status.includes("pending"))) return false;
  return false;
}

function mapRentCastToComp(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const street = item.formattedAddress ?? item.address ?? item.streetAddress ?? item.addressLine1 ?? (item as Record<string, unknown>).street_line_1;
  const streetStr = String(street ?? "").trim();
  // Use full address as-is if it already contains a comma (e.g. "8614 Webb Rd, Riverdale, GA 30274"); else append city, state, zip to avoid duplication
  const a = (streetStr.includes(",")
    ? streetStr
    : [streetStr, item.city, item.state, item.zipCode].filter(Boolean).join(", ")).trim() || String(item.address ?? item.formattedAddress ?? item.addressLine1 ?? "").trim();
  if (!a) return null;
  const salePrice = Number(item.price ?? item.salePrice ?? item.sale_price ?? item.lastSalePrice ?? 0);
  const saleDateRaw = item.soldDate ?? item.saleDate ?? item.sale_date ?? item.lastSaleDate ?? item.closeDate ?? "";
  const listedDateMs = parseSaleDate(item.listedDate);
  let saleDate = saleDateRaw
    ? String(saleDateRaw).trim().slice(0, 10)
    : listedDateMs > 0 && listedDateMs <= Date.now()
      ? String(item.listedDate).trim().slice(0, 10)
      : "";
  // Reject future sale dates (invalid data from API)
  if (saleDate) {
    const d = new Date(saleDate);
    if (Number.isFinite(d.getTime()) && d > new Date()) saleDate = "";
  }
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

// ---------------------------------------------------------------------------
// RentCast fetch functions
// ---------------------------------------------------------------------------

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

  const tryFetch = async (addr: string | null): Promise<Array<Record<string, unknown>>> => {
    const params = new URLSearchParams();
    if (addr) params.set("address", addr);
    if (zipCode) params.set("zipCode", zipCode);
    params.set("status", "Sold");
    params.set("limit", String(Math.min(limit, 50)));
    if (opts?.bedrooms) params.set("bedrooms", opts.bedrooms);
    if (opts?.bathrooms) params.set("bathrooms", opts.bathrooms);
    const url = `${RENTCAST_BASE}/listings/sale?${params.toString()}`;
    const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const rawList = Array.isArray(data) ? data : data?.listings ?? data?.comps ?? data?.data ?? [];
    const mapped = (rawList as Record<string, unknown>[])
      .filter((item) => !isActiveListing(item))
      .map(mapRentCastToComp)
      .filter(Boolean) as Array<Record<string, unknown>>;
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
  };

  const addrParam = opts?.fullAddress && opts.fullAddress.trim() ? opts.fullAddress.trim() : address;
  let comps = await tryFetch(addrParam);
  if (comps.length === 0 && addrParam) comps = await tryFetch(null);
  return comps;
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
  avmDiag?: { rawComparableCount: number; firstCompKeys: string[] };
};

async function fetchRentCastCompsFromAvmValue(
  address: string,
  zipCode: string,
  opts?: { compCount?: number; propertyType?: string; bedrooms?: number; bathrooms?: number; squareFootage?: number }
): Promise<AvmCompsResult> {
  const apiKey = getRentCastKey();
  if (!apiKey) return { comparables: [] };
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (zipCode) params.set("zipCode", zipCode);
  params.set("compCount", String(opts?.compCount ?? 20));
  if (opts?.propertyType) params.set("propertyType", opts.propertyType);
  if (opts?.bedrooms != null) params.set("bedrooms", String(opts.bedrooms));
  if (opts?.bathrooms != null) params.set("bathrooms", String(opts.bathrooms));
  if (opts?.squareFootage != null) params.set("squareFootage", String(opts.squareFootage));
  const url = `${RENTCAST_BASE}/avm/value?${params.toString()}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) {
    console.error(`AVM fetch failed: ${res.status} ${res.statusText} for ${url}`);
    return { comparables: [] };
  }
  const data = await res.json();
  if (!data || typeof data !== "object") return { comparables: [] };
  const d = data as Record<string, unknown>;
  const comparables = Array.isArray(d.comparables) ? d.comparables
    : Array.isArray(d.comps) ? d.comps
    : Array.isArray(d.comparableSales) ? d.comparableSales
    : Array.isArray((d as Record<string, unknown>).comparable_sales) ? (d as Record<string, unknown>).comparable_sales as unknown[]
    : [];

  const rawComparableCount = comparables.length;

  // AVM comparables are curated sold-property comps; do NOT filter by isActiveListing
  // (they don't have a "status" field -- filtering was incorrectly dropping them)
  const mapped = comparables
    .map((item: unknown) => item as Record<string, unknown>)
    .map((item) => mapRentCastToComp(item))
    .filter(Boolean) as Array<Record<string, unknown>>;

  const rawValue = d.value ?? d.price ?? d.avmValue ?? d.estimatedValue;
  const avmValue = rawValue != null && rawValue !== "" ? Number(rawValue) : undefined;
  const numAvm = typeof avmValue === "number" && Number.isFinite(avmValue) ? avmValue : undefined;

  const rawSubject = d.property ?? d.subject ?? d.subjectProperty;
  const subjectObj = rawSubject && typeof rawSubject === "object" && !Array.isArray(rawSubject) ? (rawSubject as Record<string, unknown>) : null;
  const avmSubject = subjectObj ? mapAvmSubject(subjectObj) : undefined;
  const avmResponseKeys = mapped.length === 0 ? Object.keys(d) : undefined;
  const avmDiag = mapped.length === 0 ? { rawComparableCount, firstCompKeys: comparables.length > 0 ? Object.keys(comparables[0] as Record<string, unknown>) : [] } : undefined;

  return { comparables: mapped, avmValue: numAvm, avmSubject, avmResponseKeys, avmDiag };
}

type CompsFetchResult = {
  comps: Array<Record<string, unknown>>;
  source: "avm" | "listings" | "properties";
  avmValue?: number;
  avmSubject?: Record<string, unknown>;
  avmResponseKeys?: string[];
  avmDiag?: { rawComparableCount: number; firstCompKeys: string[] };
};

async function fetchRentCastComps(
  address: string,
  zipCode: string,
  limit: number,
  opts?: { fullAddress?: string; city?: string; state?: string; subjectSpecs?: SubjectSpecs }
): Promise<CompsFetchResult> {
  const avmAddress = opts?.fullAddress || address;
  const avm = await fetchRentCastCompsFromAvmValue(avmAddress, zipCode, {
    compCount: 20,
    bedrooms: opts?.subjectSpecs?.bedrooms,
    bathrooms: opts?.subjectSpecs?.bathrooms,
  });

  if (avm.comparables.length > 0) {
    return { comps: avm.comparables.slice(0, limit), source: "avm", avmValue: avm.avmValue, avmSubject: avm.avmSubject };
  }

  const listings = await fetchRentCastCompsFromListings(address, zipCode, limit, { fullAddress: opts?.fullAddress });
  if (listings.length > 0) return { comps: listings, source: "listings", avmValue: avm.avmValue, avmSubject: avm.avmSubject, avmResponseKeys: avm.avmResponseKeys, avmDiag: avm.avmDiag };
  const props = await fetchRentCastCompsFromProperties(zipCode, limit, opts);
  return { comps: props, source: "properties", avmValue: avm.avmValue, avmSubject: avm.avmSubject, avmResponseKeys: avm.avmResponseKeys, avmDiag: avm.avmDiag };
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
    const { address, zipCode, city, state, subjectSpecs } = validation;
    const userId = String(body?.userId ?? body?.user_id ?? "").trim();
    const propertyId = String(body?.propertyId ?? body?.property_id ?? "").trim() || undefined;
    const subjectAddress = String(body?.subjectAddress ?? body?.subject_address ?? body?.address ?? "").trim() || undefined;
    const debugRequested = body?.debug === true;

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const usage = userId ? await getUsage(supabase, userId, ym) : { realie_count: 0, rentcast_count: 0 };
    const rentcastAllowed = !userId || usage.rentcast_count + 3 <= RENTCAST_LIMIT;

    let recentComps: Array<Record<string, unknown>> = [];
    let subjectSaleListing: Record<string, unknown> | null = null;
    let avmValue: number | undefined;
    let avmSubject: Record<string, unknown> | undefined;
    const errors: string[] = [];
    let debugComps: { fetchSource?: string; compsRawCount: number; notSubjectCount: number; recentCompsCount: number; avmResponseKeys?: string[]; avmDiag?: unknown } | null = null;

    const fullAddress = buildFullAddress({ address, zipCode, city, state });

    if (getRentCastKey() && rentcastAllowed) {
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

        const subjectLat = avmSubject?.latitude != null && Number.isFinite(Number(avmSubject.latitude)) ? Number(avmSubject.latitude) : undefined;
        const subjectLng = avmSubject?.longitude != null && Number.isFinite(Number(avmSubject.longitude)) ? Number(avmSubject.longitude) : undefined;
        if (subjectLat != null && subjectLng != null) {
          for (const c of notSubject) {
            if (c.distance != null && Number.isFinite(Number(c.distance))) continue;
            const clat = c.latitude != null && Number.isFinite(Number(c.latitude)) ? Number(c.latitude) : undefined;
            const clng = c.longitude != null && Number.isFinite(Number(c.longitude)) ? Number(c.longitude) : undefined;
            if (clat != null && clng != null) {
              const miles = computeDistanceFromCoords(subjectLat, subjectLng, clat, clng);
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
          if (fetchResult.avmDiag) debugComps.avmDiag = fetchResult.avmDiag;
        }
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
    if (avmValue != null) result.avmValue = avmValue;
    if (avmSubject != null) result.avmSubject = avmSubject;
    if (debugRequested) {
      result._debug = { address, zipCode, city: city ?? null, state: state ?? null, propertyId: propertyId ?? null, subjectAddress: subjectAddress ?? null, fullAddress };
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
