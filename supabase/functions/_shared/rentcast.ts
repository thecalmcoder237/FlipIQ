declare const Deno: { env: { get(key: string): string | undefined } };

export const RENTCAST_BASE = "https://api.rentcast.io/v1";

export const RENTCAST_LIMIT = 50;

export function getRentCastKey(): string | null {
  return Deno.env.get("RENTCAST_API_KEY")?.trim() || null;
}

/**
 * Build full RentCast address: "Street, City, State, Zip".
 * RentCast expects state as a 2-character uppercase abbreviation.
 */
export function buildFullAddress(opts: {
  address: string;
  zipCode: string;
  city?: string;
  state?: string;
}): string {
  const stateNorm = opts.state?.trim().slice(0, 2).toUpperCase() || undefined;
  const parts = [opts.address.trim(), opts.city?.trim(), stateNorm, opts.zipCode].filter(Boolean);
  return parts.join(", ");
}
