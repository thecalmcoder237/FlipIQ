/**
 * Property intelligence response contract and normalizer.
 * Aligns edge function response with frontend expectations so field names and types stay consistent.
 *
 * @typedef {Object} RecentComp
 * @property {string} address
 * @property {number} salePrice
 * @property {number|string} sqft
 * @property {number|string} beds
 * @property {number|string} baths
 * @property {number|string} dom
 * @property {string} saleDate
 * @property {string} [basement]
 * @property {string} [basementType]
 * @property {string} [basementCondition]
 * @property {string} [parkingType]
 * @property {number|string} [parkingSpaces]
 * @property {number|string} [levels]
 *
 * @typedef {Object} PropertyIntelligence
 * @property {string} [propertyType]
 * @property {number} [yearBuilt]
 * @property {number} [squareFootage]
 * @property {number|string} [bedrooms]
 * @property {number|string} [bathrooms]
 * @property {boolean} [hasGarage]
 * @property {string} [garageSize]
 * @property {string} [hvacType]
 * @property {string} [hvacAge]
 * @property {string} [roofType]
 * @property {string} [roofAge]
 * @property {string} [schoolDistrict]
 * @property {string} [zoning]
 * @property {string} [county]
 * @property {number} [annualPropertyTaxes]
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {string} [propertyId]
 * @property {RecentComp[]} [recentComps]
 */

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1800;
const MAX_YEAR = CURRENT_YEAR + 1;

function safeNum(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

function safeStr(value) {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

/**
 * Normalize a single comp from edge response to frontend shape.
 * Maps common API field names (sale_price, price, bedrooms, daysOnMarket, sale_date) to expected names.
 * @param {Record<string, unknown>} raw
 * @returns {RecentComp|null} Normalized comp or null if missing critical fields
 */
function normalizeComp(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const address = safeStr(raw.address ?? raw.formattedAddress ?? raw.streetAddress);
  if (!address) return null;

  const salePrice = safeNum(raw.salePrice ?? raw.sale_price ?? raw.price ?? raw.last_sale_price ?? raw.lastSalePrice);
  const sqft = raw.sqft != null ? (Number(raw.sqft) || raw.sqft) : (raw.squareFootage ?? raw.square_footage);
  const beds = raw.beds ?? raw.bedrooms ?? raw.beds;
  const baths = raw.baths ?? raw.bathrooms ?? raw.baths;
  const dom = raw.dom ?? raw.daysOnMarket ?? raw.days_on_market;
  const saleDate = safeStr(raw.saleDate ?? raw.sale_date ?? raw.sold_date ?? raw.soldDate ?? raw.close_date ?? raw.closeDate);
  const basement = safeStr(raw.basement ?? raw.basement_type);
  const basementType = safeStr(raw.basementType ?? raw.basement_type);
  const basementCondition = safeStr(raw.basementCondition ?? raw.basement_condition);
  const parkingType = safeStr(raw.parkingType ?? raw.parking_type ?? raw.garageType ?? raw.garage_type);
  const parkingSpaces = raw.parkingSpaces != null ? (Number(raw.parkingSpaces) || raw.parkingSpaces) : (raw.parking_spaces ?? raw.garageSpaces ?? raw.numberOfParking);
  const levels = raw.levels != null ? (Number(raw.levels) || raw.levels) : (raw.stories ?? raw.numberOfStories ?? raw.stories_count);

  return {
    address,
    salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
    sqft: sqft !== undefined ? sqft : undefined,
    beds: beds !== undefined && beds !== null ? String(beds) : undefined,
    baths: baths !== undefined && baths !== null ? String(baths) : undefined,
    dom: dom !== undefined && dom !== null ? String(dom) : undefined,
    saleDate: saleDate || undefined,
    basement: basement || undefined,
    basementType: basementType || undefined,
    basementCondition: basementCondition || undefined,
    parkingType: parkingType || undefined,
    parkingSpaces: parkingSpaces !== undefined && parkingSpaces !== null ? (Number(parkingSpaces) || String(parkingSpaces)) : undefined,
    levels: levels !== undefined && levels !== null ? (Number(levels) || String(levels)) : undefined,
  };
}

/**
 * Validate and normalize property intelligence response from fetch-property-intelligence.
 * Coerces types, clamps ranges, normalizes comps to frontend contract (salePrice, sqft, beds, baths, dom, saleDate).
 * @param {Record<string, unknown>} raw - Raw response from edge function
 * @returns {PropertyIntelligence & { recentComps: RecentComp[] }} Normalized object safe for display
 */
export function normalizePropertyIntelligenceResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    return { recentComps: [] };
  }

  const yearBuilt = safeNum(raw.yearBuilt ?? raw.year_built ?? raw.YearBuilt, MIN_YEAR, MAX_YEAR);
  const squareFootage = safeNum(raw.squareFootage ?? raw.square_footage ?? raw.sqft ?? raw.SquareFootage, 0, 1e7);
  const annualPropertyTaxes = safeNum(raw.annualPropertyTaxes ?? raw.annual_property_taxes ?? raw.propertyTaxes ?? raw.TaxAmount ?? raw.taxAmount, 0, 1e10);

  const compsRaw = Array.isArray(raw.recentComps) ? raw.recentComps : Array.isArray(raw.recent_comps) ? raw.recent_comps : [];
  const recentComps = compsRaw
    .map((c) => normalizeComp(c))
    .filter((c) => c !== null && c.address);

  const latitude = raw.latitude != null ? safeNum(raw.latitude, -90, 90) : undefined;
  const longitude = raw.longitude != null ? safeNum(raw.longitude, -180, 180) : undefined;
  const propertyId = safeStr(raw.propertyId ?? raw.property_id ?? raw.parcelId ?? raw.parcel_id ?? raw.ParcelNumber);

  const out = {
    propertyType: safeStr(raw.propertyType ?? raw.property_type ?? raw.UseCode),
    yearBuilt: yearBuilt ?? undefined,
    squareFootage: squareFootage && squareFootage > 0 ? squareFootage : undefined,
    bedrooms: raw.bedrooms != null ? (Number(raw.bedrooms) || raw.bedrooms) : undefined,
    bathrooms: raw.bathrooms != null ? (Number(raw.bathrooms) || raw.bathrooms) : undefined,
    hasGarage: Boolean(raw.hasGarage ?? raw.has_garage),
    garageSize: safeStr(raw.garageSize ?? raw.garage_size),
    hvacType: safeStr(raw.hvacType ?? raw.hvac_type),
    hvacAge: safeStr(raw.hvacAge ?? raw.hvac_age),
    roofType: safeStr(raw.roofType ?? raw.roof_type),
    roofAge: safeStr(raw.roofAge ?? raw.roof_age),
    schoolDistrict: safeStr(raw.schoolDistrict ?? raw.school_district),
    zoning: safeStr(raw.zoning),
    county: safeStr(raw.county ?? raw.County),
    annualPropertyTaxes: annualPropertyTaxes != null && annualPropertyTaxes >= 0 ? annualPropertyTaxes : undefined,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    propertyId: propertyId || undefined,
    recentComps,
  };

  // Preserve any other top-level keys the edge function returns (e.g. propertySpecs) without mutating
  const knownKeys = new Set([
    'propertyType', 'yearBuilt', 'squareFootage', 'bedrooms', 'bathrooms',
    'hasGarage', 'garageSize', 'hvacType', 'hvacAge', 'roofType', 'roofAge',
    'schoolDistrict', 'zoning', 'county', 'annualPropertyTaxes', 'recentComps',
    'property_type', 'year_built', 'square_footage', 'recent_comps', 'propertySpecs',
    'latitude', 'longitude', 'propertyId', 'property_id', 'parcelId', 'parcel_id', 'usage',
  ]);
  Object.keys(raw).forEach((key) => {
    if (knownKeys.has(key)) return;
    if (out[key] === undefined) out[key] = raw[key];
  });

  return out;
}
