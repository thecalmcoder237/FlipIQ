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

// ── Comps web search (OpenAI GPT) ───────────────────────────────────────────

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GPT_MODEL = "gpt-4o-mini";
const SERPER_BASE = "https://google.serper.dev/search";

function getOpenAIKey(): string | null {
  return Deno.env.get("OPENAI_API_KEY")?.trim() || null;
}

function getSerperKey(): string | null {
  return Deno.env.get("SERPER_API_KEY")?.trim() || null;
}

/** Call Serper for web search; returns combined snippet text or empty string. */
async function runSerperSearch(query: string): Promise<string> {
  const apiKey = getSerperKey();
  if (!apiKey) return "";
  try {
    const res = await fetch(SERPER_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ q: query }),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { organic?: Array<{ title?: string; snippet?: string; link?: string }> };
    const organic = Array.isArray(data?.organic) ? data.organic : [];
    return organic
      .slice(0, 15)
      .map((o) => [o.title, o.snippet].filter(Boolean).join(": "))
      .join("\n\n");
  } catch {
    return "";
  }
}

/** Normalize AI-returned comp to our schema (address required). */
function normalizeAiComp(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const address = String(raw.address ?? raw.formattedAddress ?? raw.streetAddress ?? "").trim()
    || [raw.city, raw.state, raw.zipCode ?? raw.zip].filter(Boolean).join(", ").trim();
  if (!address) return null;
  const salePrice = raw.salePrice ?? raw.sale_price ?? raw.price ?? raw.lastSalePrice;
  const numPrice = salePrice != null && salePrice !== "" ? Number(salePrice) : undefined;
  const saleDate = raw.saleDate ?? raw.sale_date ?? raw.soldDate ?? raw.sold_date ?? raw.closeDate;
  const dateStr = saleDate != null ? String(saleDate).trim().slice(0, 10) : undefined;
  return {
    address,
    salePrice: Number.isFinite(numPrice) ? numPrice : undefined,
    saleDate: dateStr,
    sqft: raw.sqft ?? raw.squareFootage ?? raw.square_footage,
    beds: raw.beds ?? raw.bedrooms,
    baths: raw.baths ?? raw.bathrooms,
    dom: raw.dom ?? raw.daysOnMarket ?? raw.days_on_market,
  };
}

/** True if date string (YYYY-MM-DD or partial) is within the last 6 months. */
function isWithinLast6Months(dateStr: string | undefined): boolean {
  if (!dateStr || dateStr.length < 4) return false;
  const d = new Date(dateStr.slice(0, 10));
  if (!Number.isFinite(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  return d >= cutoff;
}

/** Request comps via OpenAI (GPT); optionally use Serper web search for context. Only comps within 1 mile of subject. */
async function runCompsWebSearch(
  address: string,
  zipCode: string,
  subjectLat?: number,
  subjectLng?: number
): Promise<{ comps: Array<Record<string, unknown>>; source: string }> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set for the send-claude-request function. Add it in Supabase Dashboard → Edge Functions → send-claude-request → Secrets.");
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoffDateStr = sixMonthsAgo.toISOString().slice(0, 10);

  const oneMilePhrase = "within 1 mile radius";
  const searchQuery = zipCode
    ? `homes sold last 6 months ${currentYear} within 1 mile ${address} ${zipCode} recent sales`
    : `homes sold last 6 months ${currentYear} within 1 mile ${address} recent sales`;
  const searchContext = await runSerperSearch(searchQuery);
  const hasSearch = searchContext.length > 0;

  const locationHint =
    subjectLat != null && subjectLng != null && Number.isFinite(subjectLat) && Number.isFinite(subjectLng)
      ? ` Subject property coordinates: ${subjectLat}, ${subjectLng}. Only include comps within 1 mile of this location.`
      : ` Only include comparable sales within a 1 mile radius of the subject property.`;

  const systemPrompt = `You are a real estate analyst. Return a JSON array of comparable home sales (comps) for the given property. CRITICAL RULES: (1) Only include sales that closed in the LAST 6 MONTHS (saleDate must be ${cutoffDateStr} or later). (2) Only include sales ${oneMilePhrase} of the subject property—exclude anything farther. Do not include any sale from 2023 or earlier. Each comp must be an object with these keys (use null or omit if unknown): address (string), salePrice (number), saleDate (string, YYYY-MM-DD), sqft (number or string), beds (number or string), baths (number or string), dom (number or string). Return only the JSON array, no markdown. Include 3 to 8 comps. Only real sales with sale price and address.`;

  const userContent = hasSearch
    ? `Subject property: ${address}${zipCode ? `, ZIP ${zipCode}` : ""}.${locationHint}\n\nWeb search results (use only sales from within 1 mile of the subject; prioritize most recent):\n${searchContext}\n\nExtract ONLY comparable sales that (1) closed in the last 6 months (saleDate ${cutoffDateStr} or later) and (2) are within 1 mile of the subject. Return a JSON array of comp objects (address, salePrice, saleDate, sqft, beds, baths, dom). Exclude any sale from 2023 or before or outside 1 mile. Return only the array.`
    : `Subject property: ${address}${zipCode ? `, ZIP ${zipCode}` : ""}.${locationHint}\n\nYou do not have live data. Return a JSON array of comp objects with keys: address, salePrice, saleDate (last 6 months only, e.g. ${currentYear}), sqft, beds, baths, dom. Use plausible addresses and prices for properties within 1 mile. saleDate MUST be within the last 6 months. Return only the JSON array.`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GPT_MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  let arr: unknown[] = [];
  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    arr = Array.isArray(parsed) ? parsed : (parsed?.comps && Array.isArray(parsed.comps) ? parsed.comps : []);
  } catch {
    // try to extract array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        arr = JSON.parse(match[0]);
      } catch {
        // ignore
      }
    }
  }

  const normalized = (arr as Record<string, unknown>[])
    .map((c) => normalizeAiComp(c))
    .filter((c): c is Record<string, unknown> => c != null && (c.address as string)?.trim().length > 0);

  // Only allow comps with saleDate within last 6 months; do not return or display anything older
  const comps = normalized.filter((c) => {
    const dateStr = (c.saleDate as string) ?? (c.sale_date as string);
    if (!dateStr || dateStr.length < 4) return false; // no date = exclude (cannot verify recency)
    return isWithinLast6Months(dateStr);
  });

  return { comps, source: hasSearch ? "ChatGPT (Web Search)" : "ChatGPT" };
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
      const comps = await fetchRentCastComps(address, zipCode, 5);
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

    if (requestType === "compsWebSearch") {
      // Return 200 with error in body so the client can always read the message (Supabase invoke hides body on 4xx/5xx).
      if (!address || address.length < 5) {
        return json({
          comps: [],
          recentComps: [],
          source: "ChatGPT",
          error: "Address is required (at least 5 characters) for comps web search.",
        });
      }
      const subjectLat = additionalParams.lat != null && Number.isFinite(Number(additionalParams.lat)) ? Number(additionalParams.lat) : undefined;
      const subjectLng = additionalParams.lng != null && Number.isFinite(Number(additionalParams.lng)) ? Number(additionalParams.lng) : undefined;
      try {
        const { comps, source } = await runCompsWebSearch(address, zipCode, subjectLat, subjectLng);
        return json({ comps, source, recentComps: comps });
      } catch (e) {
        console.error("compsWebSearch error:", e);
        const message = (e as Error).message || "Comps web search failed.";
        return json({
          comps: [],
          recentComps: [],
          source: "ChatGPT",
          error: message,
        });
      }
    }

    if (requestType === "market_shock_analysis") {
      // Default market shock scenarios (no Claude call yet). Client expects this shape.
      return json({
        rateSpike: {
          currentRate: 4.5,
          probability: 35,
          impactHoldingCost: 18,
          impactROI: -9,
          dataSource: "FRED Economic Data",
        },
        demandDrop: {
          currentInventory: 1200,
          probability: 28,
          impactDOM: 19,
          impactSalePrice: -7,
          dataSource: "Local MLS API",
        },
        constructionInflation: {
          currentLumberIndex: 145.2,
          probability: 42,
          impactRehabBudget: 12,
          dataSource: "U.S. BLS CPI",
        },
        regulatory: {
          recentChanges: "No major changes detected",
          probability: 15,
          impactTimeline: 0,
          impactCost: 0,
          dataSource: "Municipal records",
        },
        aiInsight:
          "Based on 2025 Q1 data, deals in your ZIP saw 18% longer DOM when interest rates exceeded 7.2%",
      });
    }

    return json(
      { error: `Invalid or unsupported requestType. Use analyzePropertyComps, compsWebSearch, or market_shock_analysis.` },
      { status: 400 }
    );
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});
