// Inlined CORS (no _shared dependency so single-function deploy works)
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  return null;
}
function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}), ...corsHeaders },
  });
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const VISION_MODEL = "claude-3-haiku-20240307";

function getApiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("CLAUDE_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY or CLAUDE_API_KEY is required");
  return key;
}

async function fetchImageAsBase64(url: string): Promise<{ type: "base64"; media_type: string; data: string } | null> {
  try {
    const res = await fetch(url, { headers: { "Accept": "image/*" } });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const mediaType = res.headers.get("content-type") || "image/jpeg";
    return { type: "base64", media_type: mediaType, data: base64 };
  } catch {
    return null;
  }
}

async function runVisionAnalyze(body: {
  deal?: Record<string, unknown>;
  images?: string[];
  perPhotoAnalysis?: Array<{ url?: string; analysis?: Record<string, unknown> }>;
}): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  const deal = body.deal || {};
  const images: string[] = Array.isArray(body.images) ? body.images : [];
  const perPhotoAnalysis = Array.isArray(body.perPhotoAnalysis) ? body.perPhotoAnalysis : [];

  const address = (deal.address as string) || "Unknown";
  const zipCode = deal.zipCode ?? deal.zip_code ?? "";
  const propertyType = deal.propertyType ?? deal.property_type ?? "Single-Family";
  const arv = deal.arv ?? 0;
  const purchasePrice = deal.purchasePrice ?? deal.purchase_price ?? 0;
  const rehabBudget = deal.rehabCosts ?? deal.rehab_costs ?? 0;
  const sqft = deal.squareFootage ?? deal.square_footage ?? deal.sqft ?? "";
  const beds = deal.bedrooms ?? deal.beds ?? "";
  const baths = deal.bathrooms ?? deal.baths ?? "";
  const yearBuilt = deal.yearBuilt ?? deal.year_built ?? "";
  const county = deal.county ?? "";
  const city = deal.city ?? "";

  const perPhotoSummary = perPhotoAnalysis
    .map((p, i) => {
      const a = p.analysis;
      if (!a) return `Photo ${i + 1}: no analysis`;
      return `Photo ${i + 1}: condition=${a.condition ?? "?"}, observations=${a.observations ?? "?"}, rehab_needs=${a.rehab_needs ?? "?"}`;
    })
    .join("\n");

  const imageBlocks: { type: "image"; source: { type: "base64"; media_type: string; data: string } }[] = [];
  for (const url of images.slice(0, 10)) {
    const img = await fetchImageAsBase64(url);
    if (img) imageBlocks.push({ type: "image", source: img });
  }

  const propertyContext = [
    `Address: ${address}`,
    zipCode ? `ZIP: ${zipCode}` : "",
    city ? `City: ${city}` : "",
    county ? `County: ${county}` : "",
    `Type: ${propertyType}`,
    sqft ? `Sq Ft: ${sqft}` : "",
    beds ? `Bedrooms: ${beds}` : "",
    baths ? `Bathrooms: ${baths}` : "",
    yearBuilt ? `Year Built: ${yearBuilt}` : "",
    arv ? `ARV: $${arv}` : "",
    purchasePrice ? `Purchase Price: $${purchasePrice}` : "",
    rehabBudget ? `Rehab Budget (reference): $${rehabBudget}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const systemPrompt = `You are a rehab and property assessment expert. Use ALL property data provided below AND the uploaded photos to produce an accurate assessment. Analyze the provided property photos and any per-photo analysis. Return a JSON object only (no markdown, no code fence) with these keys (use string or number values suitable for display in a key-value grid):
- roof_type_or_age: string (e.g. "Composition, ~15 years")
- hvac_type_or_age: string (e.g. "Central AC, age unknown")
- foundation_notes: string (e.g. "Slab" or "Full basement")
- construction_type: string (e.g. "Frame", "Masonry")
- rehab_priorities_critical: string (comma-separated critical items)
- rehab_priorities_cosmetic: string (comma-separated cosmetic items)
- value_add_opportunities: string (short list, e.g. "Convert half-bath to full")
- cost_benchmark_notes: string (optional, e.g. "Local material/labor ranges for roof, HVAC")
If something cannot be determined from the images or data, use "Unknown" or "Not visible". Keep values concise.`;

  const userParts: { type: "text"; text: string }[] = [
    {
      type: "text",
      text: `Property data (use this plus the images for your analysis):\n${propertyContext}\n\nPer-photo analysis summary:\n${perPhotoSummary || "None."}\n\nAnalyze the images and all property data above, then return only the JSON object.`,
    },
  ];

  const content: { type: "text"; text: string }[] | ({ type: "image"; source: { type: "base64"; media_type: string; data: string } })[] = [
    ...userParts,
    ...imageBlocks,
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  const text = textBlock?.text?.trim() || "{}";

  let parsed: Record<string, unknown>;
  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { raw_assessment: text };
  }

  return parsed;
}

function summarizeComps(comps: unknown): string {
  if (!Array.isArray(comps) || comps.length === 0) return "";
  const lines = comps.slice(0, 8).map((c: Record<string, unknown>, i: number) => {
    const addr = c.address ?? c.formattedAddress ?? c.streetAddress ?? "?";
    const price = c.price ?? c.listPrice ?? c.salePrice ?? c.avmValue ?? "?";
    const beds = c.bedrooms ?? c.beds ?? "?";
    const baths = c.bathrooms ?? c.baths ?? "?";
    const sqft = c.squareFootage ?? c.sqft ?? c.square_feet ?? "?";
    return `Comp ${i + 1}: ${addr} — $${price}, ${beds} bed, ${baths} bath, ${sqft} sqft`;
  });
  return lines.join("\n");
}

async function runSOWGeneration(body: {
  userAddress?: string;
  rehabBudget?: number;
  propertyDescription?: string;
  images?: string[];
  deal?: Record<string, unknown>;
  compsSummary?: string;
  recentComps?: unknown[];
}): Promise<string> {
  const apiKey = getApiKey();
  const address = body.userAddress || "Unknown";
  const budget = body.rehabBudget || 0;
  const desc = body.propertyDescription || "{}";
  const imageUrls: string[] = Array.isArray(body.images) ? body.images : [];
  const deal = body.deal || {};
  const compsSummary = body.compsSummary || summarizeComps(body.recentComps || []);

  const arv = deal.arv ?? 0;
  const purchasePrice = deal.purchasePrice ?? deal.purchase_price ?? 0;
  const sqft = deal.squareFootage ?? deal.square_footage ?? deal.sqft ?? "";
  const beds = deal.bedrooms ?? deal.beds ?? "";
  const baths = deal.bathrooms ?? deal.baths ?? "";
  const yearBuilt = deal.yearBuilt ?? deal.year_built ?? "";
  const county = deal.county ?? "";
  const dealContext = [
    address,
    arv ? `ARV: $${arv}` : "",
    purchasePrice ? `Purchase: $${purchasePrice}` : "",
    budget ? `Rehab budget ref: $${budget}` : "",
    sqft ? `Sq Ft: ${sqft}` : "",
    beds ? `Beds: ${beds}` : "",
    baths ? `Baths: ${baths}` : "",
    yearBuilt ? `Year built: ${yearBuilt}` : "",
    county ? `County: ${county}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const imageBlocks: { type: "image"; source: { type: "base64"; media_type: string; data: string } }[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    const img = await fetchImageAsBase64(url);
    if (img) imageBlocks.push({ type: "image", source: img });
  }

  const systemPrompt = `You are a rehab scope-of-work writer. Use ALL property data, deal context, comps (if provided), AND the uploaded photos to produce an accurate Scope of Work.

Structure your response with these sections IN ORDER:

1) ## SOW Remarks
Write 2–4 short paragraphs that explain: (a) What you analyzed—property data, photos, and comps you used. (b) What you took note of—key conditions, risks, or opportunities. (c) Reasons for this SOW—why these line items and estimates. Be specific and reference the property and images.

2) ## Scope of Work (main body)
Use headers (##) per category and markdown tables with costs. For each category (Exterior, Kitchen, Bathrooms, Systems, Finishes), include a table with columns Item and Est. Cost. Base estimates on the property description, deal context, comps, and images.

3) At the end of the document include:
- Estimated timeline: X weeks (or X months)
- Total Estimated Cost: $XX,XXX
- Tier summary table:
| Finish Level | Total |
|--------------|-------|
| Budget | $XX,XXX |
| Mid-Grade | $XX,XXX |
| High-End | $XX,XXX |

4) ## Pro Flipper Recommendations
Write 3–6 bullet or short paragraphs of pro flipper recommendations based on the analysis, comps, and SOW. Examples: converting 1.5 bath to 2 full baths to increase ARV; adding a bedroom or finishing a basement if comps support it; which finish tier to target for this market; specific value-adds that comps suggest; holding or selling timing; any red flags. Be concrete and reference the data.`;

  const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } })[] = [
    {
      type: "text",
      text: `Deal and property context: ${dealContext}\n\nProperty description (full): ${desc}\n\n${compsSummary ? `Comps (use for ARV and value-add ideas):\n${compsSummary}\n\n` : ""}Generate the full SOW including SOW Remarks, Scope of Work with tables, timeline, total, tier table, and Pro Flipper Recommendations. Use the images and all data above for accuracy.`,
    },
    ...imageBlocks,
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  return textBlock?.text?.trim() || "## Scope of Work\n\nUnable to generate content.";
}

function stubBudget(body: { deal?: Record<string, unknown>; propertyDetails?: Record<string, unknown> }): Record<string, unknown> {
  const total = 50000;
  return {
    total_budget: total,
    timeline_weeks: 8,
    room_breakdown: [
      { area_name: "Kitchen", items: [{ task: "Cabinets & counters", cost: 12000, notes: "Estimate" }] },
      { area_name: "Bathrooms", items: [{ task: "Fixtures & tile", cost: 8000, notes: "Estimate" }] },
      { area_name: "General", items: [{ task: "Paint, flooring, misc", cost: 15000, notes: "Estimate" }] },
    ],
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));

    // Handle analyze and generate_budget first; they do not require userAddress/rehabBudget
    if (body?.action === "analyze") {
      const property_details = await runVisionAnalyze(body);
      return json({ property_details });
    }

    if (body?.action === "generate_budget") {
      const budget = stubBudget(body);
      return json(budget);
    }

    // SOW generation requires userAddress (rehabBudget is optional)
    const hasUserAddress = body?.userAddress != null && String(body.userAddress).trim() !== "";
    if (hasUserAddress) {
      const data = await runSOWGeneration(body);
      return json({ data });
    }

    return json({ error: "Missing action or userAddress. For SOW generation send userAddress. For Advanced Analysis send action: 'analyze' with deal and images." }, { status: 400 });
  } catch (e) {
    console.error("generate-rehab-sow error:", e);
    return json({ error: e?.message ?? String(e) }, { status: 500 });
  }
});
