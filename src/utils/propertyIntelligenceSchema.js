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
  const address = safeStr(raw.address ?? raw.formattedAddress ?? raw.streetAddress)
    || [raw.city, raw.state, raw.zipCode ?? raw.zip_code ?? raw.zip].filter(Boolean).join(', ').trim() || null;
  if (!address) return null;

  const salePrice = safeNum(raw.salePrice ?? raw.sale_price ?? raw.price ?? raw.last_sale_price ?? raw.lastSalePrice);
  const sqft = raw.sqft != null ? (Number(raw.sqft) || raw.sqft) : (raw.squareFootage ?? raw.square_footage);
  const beds = raw.beds ?? raw.bedrooms ?? raw.beds;
  const baths = raw.baths ?? raw.bathrooms ?? raw.baths;
  const dom = raw.dom ?? raw.daysOnMarket ?? raw.days_on_market ?? raw.listingAge;
  const saleDate = safeStr(raw.saleDate ?? raw.sale_date ?? raw.sold_date ?? raw.soldDate ?? raw.close_date ?? raw.closeDate);
  const basement = safeStr(raw.basement ?? raw.basement_type);
  const basementType = safeStr(raw.basementType ?? raw.basement_type);
  const basementCondition = safeStr(raw.basementCondition ?? raw.basement_condition);
  const parkingType = safeStr(raw.parkingType ?? raw.parking_type ?? raw.garageType ?? raw.garage_type);
  const parkingSpaces = raw.parkingSpaces != null ? (Number(raw.parkingSpaces) || raw.parkingSpaces) : (raw.parking_spaces ?? raw.garageSpaces ?? raw.numberOfParking);
  const levels = raw.levels != null ? (Number(raw.levels) || raw.levels) : (raw.stories ?? raw.numberOfStories ?? raw.stories_count);
  const yearBuilt = raw.yearBuilt != null ? safeNum(raw.yearBuilt, MIN_YEAR, MAX_YEAR) : (raw.year_built != null ? safeNum(raw.year_built, MIN_YEAR, MAX_YEAR) : (raw.YearBuilt != null ? safeNum(raw.YearBuilt, MIN_YEAR, MAX_YEAR) : undefined));
  const latitude = raw.latitude != null ? safeNum(raw.latitude, -90, 90) : (raw.lat != null ? safeNum(raw.lat, -90, 90) : undefined);
  const longitude = raw.longitude != null ? safeNum(raw.longitude, -180, 180) : (raw.lng != null ? safeNum(raw.lng, -180, 180) : (raw.lon != null ? safeNum(raw.lon, -180, 180) : undefined));
  const distVal = raw.distance ?? raw.distance_in_miles ?? raw.distanceMiles ?? raw.milesFromSubject ?? raw.distanceFromSubject;
  const distance = distVal != null ? safeNum(distVal, 0, 1e6) : undefined;

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
    yearBuilt: yearBuilt ?? undefined,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    distance: distance ?? undefined,
  };
}

/** True if comp's saleDate is within the last 6 months from today; used so search results never display or add older comps. */
export function isCompWithinLast6Months(comp) {
  if (!comp || typeof comp !== 'object') return false;
  const dateStr = comp.saleDate ?? comp.sale_date ?? comp.soldDate;
  if (!dateStr || String(dateStr).trim().length < 4) return false;
  const d = new Date(String(dateStr).trim().slice(0, 10));
  if (!Number.isFinite(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  return d >= cutoff;
}

/** Export for use when merging manual or AI-sourced comps. */
export { normalizeComp };

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
  // Flatten: edge may return { ...property, recentComps, rawRentCastRecord } or { property: {...}, recentComps }; merge so fields are at top level
  const merged = raw.property && typeof raw.property === 'object'
    ? { ...raw.property, recentComps: raw.recentComps ?? raw.recent_comps, usage: raw.usage, source: raw.source, warnings: raw.warnings, rawRentCastRecord: raw.rawRentCastRecord }
    : { ...raw };

  const yearBuilt = safeNum(merged.yearBuilt ?? merged.year_built ?? merged.YearBuilt, MIN_YEAR, MAX_YEAR);
  const squareFootage = safeNum(merged.squareFootage ?? merged.square_footage ?? merged.sqft ?? merged.SquareFootage, 0, 1e7);
  const annualPropertyTaxes = safeNum(merged.annualPropertyTaxes ?? merged.annual_property_taxes ?? merged.propertyTaxes ?? merged.TaxAmount ?? merged.taxAmount ?? merged.tax ?? merged.propertyTax ?? merged.annualTax ?? merged.totalTax, 0, 1e10);
  const assessedValue = safeNum(merged.assessedValue ?? merged.assessed_value ?? merged.taxAssessedValue ?? merged.tax_assessed_value ?? merged.assessmentValue ?? merged.taxAssessment, 0, 1e12);

  const compsRaw = Array.isArray(merged.recentComps) ? merged.recentComps : Array.isArray(merged.recent_comps) ? merged.recent_comps : [];
  let recentComps = compsRaw
    .map((c) => normalizeComp(c))
    .filter((c) => c !== null && c.address);
  const subjectSaleListingRaw = merged.subjectSaleListing ?? merged.subject_sale_listing;
  const subjectSaleListing = subjectSaleListingRaw && typeof subjectSaleListingRaw === 'object' ? normalizeComp(subjectSaleListingRaw) : null;

  const latitude = merged.latitude != null ? safeNum(merged.latitude, -90, 90) : undefined;
  const longitude = merged.longitude != null ? safeNum(merged.longitude, -180, 180) : undefined;
  const propertyId = safeStr(merged.propertyId ?? merged.property_id ?? merged.parcelId ?? merged.parcel_id ?? merged.ParcelNumber);

  const avmValue = merged.avmValue != null ? safeNum(merged.avmValue, 0, 1e12) : undefined;
  const avmSubjectRaw = merged.avmSubject ?? merged.avm_subject;
  const avmSubject =
    avmSubjectRaw && typeof avmSubjectRaw === 'object' && !Array.isArray(avmSubjectRaw)
      ? {
          address: safeStr(avmSubjectRaw.address ?? avmSubjectRaw.formattedAddress ?? avmSubjectRaw.streetAddress),
          squareFootage: avmSubjectRaw.squareFootage != null ? safeNum(avmSubjectRaw.squareFootage, 0, 1e7) : (avmSubjectRaw.square_footage != null ? safeNum(avmSubjectRaw.square_footage, 0, 1e7) : undefined),
          bedrooms: avmSubjectRaw.bedrooms ?? avmSubjectRaw.beds,
          bathrooms: avmSubjectRaw.bathrooms ?? avmSubjectRaw.baths,
          yearBuilt: avmSubjectRaw.yearBuilt != null ? safeNum(avmSubjectRaw.yearBuilt, MIN_YEAR, MAX_YEAR) : (avmSubjectRaw.year_built != null ? safeNum(avmSubjectRaw.year_built, MIN_YEAR, MAX_YEAR) : undefined),
        }
      : undefined;

  const out = {
    propertyType: safeStr(merged.propertyType ?? merged.property_type ?? merged.UseCode),
    yearBuilt: yearBuilt ?? undefined,
    squareFootage: squareFootage && squareFootage > 0 ? squareFootage : undefined,
    bedrooms: merged.bedrooms != null ? (Number(merged.bedrooms) || merged.bedrooms) : undefined,
    bathrooms: merged.bathrooms != null ? (Number(merged.bathrooms) || merged.bathrooms) : undefined,
    hasGarage: Boolean(merged.hasGarage ?? merged.has_garage),
    garageSize: safeStr(merged.garageSize ?? merged.garage_size),
    hvacType: safeStr(merged.hvacType ?? merged.hvac_type),
    hvacAge: safeStr(merged.hvacAge ?? merged.hvac_age),
    roofType: safeStr(merged.roofType ?? merged.roof_type),
    roofAge: safeStr(merged.roofAge ?? merged.roof_age),
    schoolDistrict: safeStr(merged.schoolDistrict ?? merged.school_district),
    zoning: safeStr(merged.zoning),
    county: safeStr(merged.county ?? merged.County),
    annualPropertyTaxes: annualPropertyTaxes != null && annualPropertyTaxes >= 0 ? annualPropertyTaxes : undefined,
    assessedValue: assessedValue != null && assessedValue >= 0 ? assessedValue : undefined,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    propertyId: propertyId || undefined,
    recentComps,
  };

  if (subjectSaleListing != null && subjectSaleListing.address && !recentComps.some((c) => c.address === subjectSaleListing.address)) {
    out.subjectSaleListing = subjectSaleListing;
  }
  if (avmValue != null) out.avmValue = avmValue;
  if (avmSubject != null) out.avmSubject = avmSubject;

  // Preserve usage/source/warnings and any other keys from merged
  const knownKeys = new Set([
    'propertyType', 'yearBuilt', 'squareFootage', 'bedrooms', 'bathrooms',
    'hasGarage', 'garageSize', 'hvacType', 'hvacAge', 'roofType', 'roofAge',
    'schoolDistrict', 'zoning', 'county', 'annualPropertyTaxes', 'assessedValue', 'recentComps', 'subjectSaleListing',
    'property_type', 'year_built', 'square_footage', 'recent_comps', 'propertySpecs', 'subject_sale_listing',
    'latitude', 'longitude', 'propertyId', 'property_id', 'parcelId', 'parcel_id', 'usage', 'source', 'warnings',
    'avmValue', 'avmSubject', 'avm_value', 'avm_subject',
  ]);
  Object.keys(merged).forEach((key) => {
    if (knownKeys.has(key)) return;
    if (out[key] === undefined) out[key] = merged[key];
  });

  if (Array.isArray(merged.warnings)) out.warnings = merged.warnings;

  return out;
}
