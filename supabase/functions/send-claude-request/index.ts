import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

const RENTCAST_BASE = "https://api.rentcast.io/v1";
const RENTCAST_LIMIT = 45;

function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getRentCastKey(): string | null {
  return Deno.env.get("RENTCAST_API_KEY")?.trim() || null;
}

async function getUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string
): Promise<{ rentcast_count: number }> {
  const { data } = await supabase
    .from("api_usage")
    .select("rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  if (data) return { rentcast_count: data.rentcast_count ?? 0 };
  await supabase.from("api_usage").upsert(
    { user_id: userId, year_month: ym, realie_count: 0, rentcast_count: 0, updated_at: new Date().toISOString() },
    { onConflict: "user_id,year_month" }
  );
  return { rentcast_count: 0 };
}

async function incrementRentCastUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string
): Promise<void> {
  const { data: row } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  const realie = (row?.realie_count ?? 0) as number;
  const rentcast = ((row?.rentcast_count ?? 0) as number) + 1;
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

/** Fetch comps from RentCast (sale listings by address/zip). */
async function fetchRentCastComps(
  address: string,
  zipCode: string,
  limit: number = 10
): Promise<Array<Record<string, unknown>>> {
  const apiKey = getRentCastKey();
  if (!apiKey) return [];

  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (zipCode) params.set("zipCode", zipCode);
  params.set("limit", String(Math.min(limit, 20)));

  const url = `${RENTCAST_BASE}/listings/sale?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.listings ?? data?.comps ?? [];
  return list.slice(0, limit).map(mapRentCastToComp).filter(Boolean) as Array<Record<string, unknown>>;
}

function mapRentCastToComp(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const address = [item.formattedAddress ?? item.address ?? item.streetAddress, item.city, item.state, item.zipCode]
    .filter(Boolean)
    .join(", ");
  const a = (address || String(item.address ?? item.formattedAddress ?? "")).trim();
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
    soldDate: saleDate ? String(saleDate).slice(0, 10) : undefined,
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
    const requestType = body?.requestType ?? body?.request_type;
    const address = (body?.address ?? "").trim();
    const additionalParams = body?.additionalParams ?? body?.additional_params ?? {};
    const zipCode = (additionalParams.zipCode ?? additionalParams.zip_code ?? "").trim().replace(/\D/g, "").slice(0, 5);
    const userId = (body?.userId ?? body?.user_id ?? "").trim();

    if (requestType === "analyzePropertyComps") {
      const ym = yearMonth();
      let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
      if (userId) {
        supabase = createSupabaseAdminClient();
        const usage = await getUsage(supabase, userId, ym);
        if (usage.rentcast_count >= RENTCAST_LIMIT) {
          return json(
            {
              error: `RentCast monthly limit (${RENTCAST_LIMIT}) reached. Resets next month.`,
              usage: { rentcast_count: usage.rentcast_count, rentcast_limit: RENTCAST_LIMIT },
            },
            { status: 429 }
          );
        }
      }
      const comps = await fetchRentCastComps(address, zipCode, 10);
      if (userId && supabase) {
        await incrementRentCastUsage(supabase, userId, ym);
      }
      return json({
        comps,
        marketAnalysis: "Comparable sales from RentCast (verified sold properties).",
        arvEstimate: "See comparable sales for market context.",
        confidenceScore: comps.length > 0 ? 1 : 0,
        source: "RentCast",
      });
    }

    return json(
      { error: `Request type '${requestType}' is not implemented. Use analyzePropertyComps for comps (RentCast).` },
      { status: 400 }
    );
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});
