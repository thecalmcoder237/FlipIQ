import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";
import { callQwenJson } from "../_shared/llmClients.ts";

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
const SERPAPI_BASE = "https://serpapi.com/search.json";

function getOpenAIKey(): string | null {
  return Deno.env.get("OPENAI_API_KEY")?.trim() || null;
}

function getQwenKey(): string | null {
  return Deno.env.get("QWEN_API_KEY")?.trim() || null;
}

function getSerperKey(): string | null {
  return Deno.env.get("SERPER_API_KEY")?.trim() || null;
}

/**
 * SerpAPI key (preferred if configured).
 */
function getSerpApiKey(): string | null {
  return Deno.env.get("SERPAPI_API_KEY")?.trim() || Deno.env.get("SERP_API_KEY")?.trim() || null;
}

/**
 * Call SerpAPI (preferred) or Serper (fallback) for web search.
 * Returns a compact text corpus INCLUDING URLs so AI can cite evidence.
 */
async function runWebSearch(query: string): Promise<string> {
  const serpApiKey = getSerpApiKey();
  if (serpApiKey) {
    try {
      const params = new URLSearchParams();
      params.set("engine", "google");
      params.set("q", query);
      params.set("gl", "us");
      params.set("hl", "en");
      params.set("num", "20");
      params.set("api_key", serpApiKey);
      const url = `${SERPAPI_BASE}?${params.toString()}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return `__SERPAPI_ERROR__ status=${res.status} ${res.statusText} body=${errText.slice(0, 400)}`;
      }
      const data = (await res.json()) as {
        organic_results?: Array<{ title?: string; snippet?: string; link?: string }>;
      };
      const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];
      return organic
        .slice(0, 15)
        .map((o, idx) => {
          const title = (o.title ?? "").trim();
          const snippet = (o.snippet ?? "").trim();
          const link = (o.link ?? "").trim();
          const parts = [
            `Result ${idx + 1}: ${title || "(no title)"}`,
            link ? `URL: ${link}` : "URL: (missing)",
            snippet ? `Snippet: ${snippet}` : "Snippet: (missing)",
          ];
          return parts.join("\n");
        })
        .join("\n\n---\n\n");
    } catch {
      return "";
    }
  }

  // Fallback to Serper for compatibility if SERPAPI_API_KEY is not set.
  const apiKey = getSerperKey();
  if (!apiKey) return "";
  try {
    const res = await fetch(SERPER_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ q: query }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return `__SERPER_ERROR__ status=${res.status} ${res.statusText} body=${errText.slice(0, 400)}`;
    }
    const data = (await res.json()) as { organic?: Array<{ title?: string; snippet?: string; link?: string }> };
    const organic = Array.isArray(data?.organic) ? data.organic : [];
    return organic
      .slice(0, 15)
      .map((o, idx) => {
        const title = (o.title ?? "").trim();
        const snippet = (o.snippet ?? "").trim();
        const link = (o.link ?? "").trim();
        const parts = [
          `Result ${idx + 1}: ${title || "(no title)"}`,
          link ? `URL: ${link}` : "URL: (missing)",
          snippet ? `Snippet: ${snippet}` : "Snippet: (missing)",
        ];
        return parts.join("\n");
      })
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

/** URLs that are estimates / records / not verified sold listings — reject as comp evidence. */
function isBlockedCompSourceUrl(url: string): boolean {
  const u = url.toLowerCase();
  const blocked = [
    "propertyrecord-search",
    "/propertyrecord",
    "zestimate",
    "/home-value",
    "/home_value",
    "valuation",
    "avm",
    "tax-assessor",
    "assessor",
  ];
  return blocked.some((b) => u.includes(b));
}

/** True if snippet/title clearly indicates a completed sale (not estimate-only). */
function textIndicatesSoldSale(title: string, snippet: string): boolean {
  const t = `${title} ${snippet}`.toLowerCase();
  const soldSignals = [
    "sold on",
    "sold for",
    "last sold",
    "recently sold",
    "sold homes",
    "sold home",
    "sale date",
    "closed on",
    "sold property",
    "sold:",
    "was sold",
    "sold after",
    "sold in ",
    "sold \u2014",
    "sold —",
  ];
  if (soldSignals.some((s) => t.includes(s))) return true;
  // "sold" as whole word (avoid "unsold", "resold" edge cases: require space/punct before sold)
  if (/\b(sold|closed)\b/.test(t) && !/\bunsold\b/.test(t)) return true;
  return false;
}

/** Estimate / off-market language without a real sale — reject unless we have a valid saleDate. */
function textLooksLikeEstimateOnly(title: string, snippet: string): boolean {
  const t = `${title} ${snippet}`.toLowerCase();
  const bad = [
    /\$\s*[\d,]+\s*est\.?/i,
    /est\.\s*\$/i,
    /\bestimated\b/i,
    /\bzestimate\b/i,
    /\boff market\b/i,
    /\bnot for sale\b/i,
    /\bassessed value\b/i,
    /\btax assessment\b/i,
  ];
  return bad.some((re) => re.test(t));
}

function hasValidPastSaleDate(dateStr: string | undefined): boolean {
  if (!dateStr || dateStr.length < 8) return false;
  const d = new Date(dateStr.slice(0, 10));
  if (!Number.isFinite(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
}

/**
 * Require external evidence of an actual sale: not blocked URL, and either a past saleDate
 * or snippet/title that clearly references a sale (not estimate-only pages).
 */
function passesVerifiedSaleEvidence(c: Record<string, unknown>): boolean {
  const url = String(c.sourceUrl ?? c.source_url ?? "").trim();
  if (!url || isBlockedCompSourceUrl(url)) return false;

  const title = String(c.sourceTitle ?? c.source_title ?? "").trim();
  const snippet = String(c.sourceSnippet ?? c.source_snippet ?? "").trim();
  const dateStr = (c.saleDate ?? c.sale_date) as string | undefined;
  const dateOk = hasValidPastSaleDate(typeof dateStr === "string" ? dateStr.slice(0, 10) : undefined);

  // Estimate/off-market pages need either sold language in evidence text or a real past sale date
  if (textLooksLikeEstimateOnly(title, snippet) && !textIndicatesSoldSale(title, snippet) && !dateOk) {
    return false;
  }
  if (!dateOk && !textIndicatesSoldSale(title, snippet)) return false;
  return true;
}

/** Normalize AI-returned comp to our schema (address required). */
function normalizeAiComp(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const address = String(raw.address ?? raw.formattedAddress ?? raw.streetAddress ?? "").trim()
    || [raw.city, raw.state, raw.zipCode ?? raw.zip].filter(Boolean).join(", ").trim();
  if (!address) return null;
  const sourceUrl = String(raw.sourceUrl ?? raw.source_url ?? raw.url ?? raw.link ?? "").trim();
  const sourceSnippet = String(raw.sourceSnippet ?? raw.source_snippet ?? raw.snippet ?? "").trim();
  const sourceTitle = String(raw.sourceTitle ?? raw.source_title ?? raw.title ?? "").trim();
  if (!sourceUrl) return null;
  const salePrice = raw.salePrice ?? raw.sale_price ?? raw.price ?? raw.lastSalePrice;
  const numPrice = salePrice != null && salePrice !== "" ? Number(salePrice) : undefined;
  const saleDate = raw.saleDate ?? raw.sale_date ?? raw.soldDate ?? raw.sold_date ?? raw.closeDate;
  let dateStr = saleDate != null ? String(saleDate).trim().slice(0, 10) : undefined;
  if (dateStr) {
    const d = new Date(dateStr);
    if (Number.isFinite(d.getTime()) && d > new Date()) dateStr = undefined; // reject future dates
  }
  return {
    address,
    salePrice: Number.isFinite(numPrice) ? numPrice : undefined,
    saleDate: dateStr,
    sqft: raw.sqft ?? raw.squareFootage ?? raw.square_footage,
    beds: raw.beds ?? raw.bedrooms,
    baths: raw.baths ?? raw.bathrooms,
    dom: raw.dom ?? raw.daysOnMarket ?? raw.days_on_market,
    sourceUrl,
    ...(sourceTitle ? { sourceTitle } : {}),
    ...(sourceSnippet ? { sourceSnippet } : {}),
  };
}

/** True if date string (YYYY-MM-DD or partial) is within the last 6 months and not in the future. */
function isWithinLast6Months(dateStr: string | undefined): boolean {
  if (!dateStr || dateStr.length < 4) return false;
  const d = new Date(dateStr.slice(0, 10));
  if (!Number.isFinite(d.getTime())) return false;
  if (d > new Date()) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  return d >= cutoff;
}

/** Request comps via Qwen (preferred) or OpenAI; optionally use Serper/SerpAPI web search for context. Only comps within 1 mile of subject. */
async function runCompsWebSearch(
  address: string,
  zipCode: string,
  subjectLat?: number,
  subjectLng?: number
): Promise<{
  comps: Array<Record<string, unknown>>;
  source: string;
  warnings?: string[];
  _debugSearch?: Record<string, unknown>;
  _debugAi?: Record<string, unknown>;
}> {
  const qwenKey = getQwenKey();
  const openAiKey = getOpenAIKey();
  if (!qwenKey && !openAiKey) {
    throw new Error("Either QWEN_API_KEY or OPENAI_API_KEY must be set for comps web search. Add one in Supabase Dashboard → Edge Functions → send-claude-request → Secrets.");
  }
  // Prefer OpenAI when both are set (avoids Qwen 401 if key is invalid)
  const useQwen = !!qwenKey && !openAiKey;

  const now = new Date();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoffDateStr = sixMonthsAgo.toISOString().slice(0, 10);

  const oneMilePhrase = "within 1 mile radius";
  const addrParts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const city = addrParts.length >= 2 ? addrParts[1] : "";
  const statePart = addrParts.length >= 3 ? addrParts[2] : "";
  const state = statePart ? statePart.split(/\s+/)[0] : "";

  const searchQueries: string[] = [];
  if (zipCode) searchQueries.push(`recently sold homes near ${address} ${zipCode}`);
  searchQueries.push(`recently sold homes near ${address}`);
  if (zipCode) searchQueries.push(`recently sold homes ${zipCode}`);
  if (city && state) searchQueries.push(`recently sold homes ${city} ${state}`);
  if (city && state) searchQueries.push(`site:redfin.com sold ${city} ${state} homes`);
  const hasSerpApiKey = !!getSerpApiKey();
  const hasSerperKey = !!getSerperKey();
  const provider = hasSerpApiKey ? "SerpAPI" : hasSerperKey ? "Serper" : "none";
  console.log(`[compsWebSearch] provider=${provider} hasSerpApiKey=${hasSerpApiKey} hasSerperKey=${hasSerperKey}`);

  let searchContext = "";
  let searchQuery = "";
  for (const q of searchQueries) {
    searchQuery = q;
    searchContext = await runWebSearch(q);
    if (searchContext.startsWith("__SERPAPI_ERROR__")) {
      throw new Error(`SerpAPI search failed: ${searchContext}`);
    }
    if (searchContext.startsWith("__SERPER_ERROR__")) {
      throw new Error(`Serper search failed (provider=${provider}): ${searchContext}`);
    }
    if (searchContext.length > 0) break;
  }

  const hasSearch = searchContext.length > 0;
  if (!hasSearch) {
    const hint = hasSerpApiKey
      ? "SerpAPI returned no results for this query."
      : hasSerperKey
        ? "Serper returned no results for this query."
        : "Neither SERPAPI_API_KEY nor SERPER_API_KEY is configured.";
    // No-results is not a hard failure; return empty comps so the UI can show a friendly message.
    return {
      comps: [],
      source: "Qwen/ChatGPT (Web Search)",
      warnings: [
        `No web search results found for this address. ${hint} (provider=${provider})`,
        "Try adding a ZIP code, or simplify the address (remove unit #, punctuation).",
      ],
      _debugSearch: { hasSearch, searchQuery, searchContextLen: 0 },
      _debugAi: { rawCount: 0, normalizedCount: 0, filteredCount: 0, rawText: "[]", searchContextPreview: "" },
    };
  }

  const locationHint =
    subjectLat != null && subjectLng != null && Number.isFinite(subjectLat) && Number.isFinite(subjectLng)
      ? ` Subject property coordinates: ${subjectLat}, ${subjectLng}. Only include comps within 1 mile of this location.`
      : ` Only include comparable sales within a 1 mile radius of the subject property.`;

  const systemPrompt = `You are a real estate comparable SALES (comps) extractor. Return only verified sold transactions supported by the search snippets.

STRICT RULES:
1. Each comp MUST cite a sourceUrl from the search results AND copy sourceTitle and sourceSnippet EXACTLY from that result (the snippet must mention the sale or the sold listing).
2. ONLY include properties where the search snippet/title clearly indicates a completed sale (e.g. "sold", "sold on", "recently sold", "last sold", "sold for", "sale date", "closed"). Do NOT include estimated values, "est.", Zestimate, property-record-only pages, or "off market" without an explicit sold statement.
3. Do NOT use Realtor "propertyrecord-search" URLs or similar assessor/estimate pages as sources.
4. Only include properties near the subject (same ZIP or immediate neighborhood).
5. Do NOT invent addresses, prices, or sale dates. If you cannot verify a sale from the text, omit the comp.
6. Prefer sales after ${cutoffDateStr} when possible.

JSON schema per comp:
{ "address": string, "salePrice": number, "saleDate": "YYYY-MM-DD", "sqft": number, "beds": number, "baths": number, "dom": number, "sourceUrl": string, "sourceTitle": string, "sourceSnippet": string }

Return: { "comps": [ ... ] } only. No markdown.`;

  const userContent = `Subject property: ${address}${zipCode ? `, ZIP ${zipCode}` : ""}.${locationHint}

Web search results:
${searchContext}

Extract comps only where the snippet/title explicitly supports a sold transaction. Copy sourceTitle and sourceSnippet verbatim from the matching search result. Return { "comps": [ ... ] }.`;

  let arr: unknown[] = [];
  let aiRawText = "";

  const runWithOpenAI = async (): Promise<{ arr: unknown[]; rawText: string }> => {
    const apiKey = getOpenAIKey();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
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
    try {
      const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const out = (parsed?.comps && Array.isArray(parsed.comps) ? parsed.comps : Array.isArray(parsed) ? parsed : []) as unknown[];
      return { arr: out, rawText: text.slice(0, 800) };
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          return { arr: JSON.parse(match[0]) as unknown[], rawText: text.slice(0, 800) };
        } catch {
          return { arr: [], rawText: text.slice(0, 800) };
        }
      }
      return { arr: [], rawText: text.slice(0, 800) };
    }
  };

  if (useQwen) {
    try {
      const model = Deno.env.get("QWEN_MODEL") || "qwen-plus";
      const parsed = await callQwenJson({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        model,
      });
      arr = (parsed?.comps && Array.isArray(parsed.comps) ? parsed.comps : []) as unknown[];
      try {
        aiRawText = JSON.stringify(parsed).slice(0, 800);
      } catch {
        aiRawText = "";
      }
    } catch (qwenErr) {
      const msg = (qwenErr as Error).message || "";
      if (openAiKey && (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Incorrect API key"))) {
        console.warn("[compsWebSearch] Qwen 401/invalid key, falling back to OpenAI");
        const out = await runWithOpenAI();
        arr = out.arr;
        aiRawText = out.rawText;
      } else {
        throw qwenErr;
      }
    }
  } else {
    const out = await runWithOpenAI();
    arr = out.arr;
    aiRawText = out.rawText;
  }

  const rawCount = arr.length;
  const normalized = (arr as Record<string, unknown>[])
    .map((c) => normalizeAiComp(c))
    .filter((c): c is Record<string, unknown> => c != null && (c.address as string)?.trim().length > 0);

  const withUrl = normalized.filter((c) => {
    const url = (c.sourceUrl as string) ?? (c.source_url as string);
    return !!(url && String(url).trim().length >= 8);
  });
  const comps = withUrl.filter((c) => passesVerifiedSaleEvidence(c));
  const droppedEvidence = withUrl.length - comps.length;

  const warnings: string[] = [];
  if (droppedEvidence > 0) {
    warnings.push(
      `${droppedEvidence} comp(s) removed: need a real sold listing (snippet/title must mention sold, or a past sale date) — not estimates or property-record pages.`
    );
  }

  return {
    comps,
    source: useQwen ? "Qwen (Web Search)" : "ChatGPT (Web Search)",
    ...(warnings.length ? { warnings } : {}),
    _debugSearch: { hasSearch, searchQuery, searchContextLen: searchContext.length },
    _debugAi: {
      rawCount,
      normalizedCount: normalized.length,
      filteredCount: comps.length,
      droppedNoEvidence: droppedEvidence,
      rawText: aiRawText,
      searchContextPreview: searchContext.slice(0, 1000),
    },
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
      const debugRequested = body?.debug === true || additionalParams?.debug === true;
      try {
        const result = await runCompsWebSearch(address, zipCode, subjectLat, subjectLng);
        const { comps, source, warnings, _debugSearch, _debugAi } = result;
        return json({
          comps,
          source,
          recentComps: comps,
          ...(Array.isArray(warnings) && warnings.length ? { warnings } : {}),
          ...(debugRequested && _debugSearch ? { _debugSearch } : {}),
          ...(debugRequested && _debugAi ? { _debugAi } : {}),
        });
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
