export type SubjectSpecs = { bedrooms?: number; bathrooms?: number };

type ValidationSuccess = {
  valid: true;
  address: string;
  zipCode: string;
  city?: string;
  state?: string;
  subjectSpecs?: SubjectSpecs;
};

type ValidationFailure = { valid: false; error: string };

/**
 * Validate and normalize request body for RentCast calls.
 * Works for both property-intelligence and comps -- subjectSpecs is parsed when present.
 */
export function validateAndNormalize(
  body: Record<string, unknown>
): ValidationSuccess | ValidationFailure {
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
