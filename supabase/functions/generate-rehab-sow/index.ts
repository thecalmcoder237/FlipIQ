import { handleCors, json } from "../_shared/cors.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const VISION_MODEL = "claude-3-5-sonnet-20241022";

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

  const systemPrompt = `You are a rehab and property assessment expert. Analyze the provided property photos and any per-photo analysis to produce a structured property assessment. Return a JSON object only (no markdown, no code fence) with these keys (use string or number values suitable for display in a key-value grid):
- roof_type_or_age: string (e.g. "Composition, ~15 years")
- hvac_type_or_age: string (e.g. "Central AC, age unknown")
- foundation_notes: string (e.g. "Slab" or "Full basement")
- construction_type: string (e.g. "Frame", "Masonry")
- rehab_priorities_critical: string (comma-separated critical items)
- rehab_priorities_cosmetic: string (comma-separated cosmetic items)
- value_add_opportunities: string (short list, e.g. "Convert half-bath to full")
- cost_benchmark_notes: string (optional, e.g. "Local material/labor ranges for roof, HVAC")
If something cannot be determined from the images, use "Unknown" or "Not visible". Keep values concise.`;

  const userParts: { type: "text"; text: string }[] = [
    {
      type: "text",
      text: `Property: ${address}, ${zipCode}. Type: ${propertyType}. ARV: $${arv}.\n\nPer-photo analysis summary:\n${perPhotoSummary || "None."}\n\nAnalyze the images and return only the JSON object.`,
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

async function runSOWGeneration(body: {
  userAddress?: string;
  rehabBudget?: number;
  propertyDescription?: string;
  images?: string[];
}): Promise<string> {
  const apiKey = getApiKey();
  const address = body.userAddress || "Unknown";
  const budget = body.rehabBudget || 0;
  const desc = body.propertyDescription || "{}";
  const imageUrls: string[] = Array.isArray(body.images) ? body.images : [];

  const imageBlocks: { type: "image"; source: { type: "base64"; media_type: string; data: string } }[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    const img = await fetchImageAsBase64(url);
    if (img) imageBlocks.push({ type: "image", source: img });
  }

  const systemPrompt = `You are a rehab scope-of-work writer. Generate a detailed markdown Scope of Work for the property. Use headers (##), bullet lists, and line items. Include: exterior, interior rooms, systems (HVAC, electrical, plumbing), and finishes. Base it on the property description and any provided images.`;

  const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } })[] = [
    { type: "text", text: `Address: ${address}. Budget reference: $${budget}. Property description: ${desc}. Generate the Scope of Work in markdown.` },
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

    if (body.action === "analyze") {
      const property_details = await runVisionAnalyze(body);
      return json({ property_details });
    }

    if (body.action === "generate_budget") {
      const budget = stubBudget(body);
      return json(budget);
    }

    if (body.userAddress != null && body.userAddress !== "") {
      const data = await runSOWGeneration(body);
      return json({ data });
    }

    return json({ error: "Missing action or userAddress" }, { status: 400 });
  } catch (e) {
    console.error("generate-rehab-sow error:", e);
    return json({ error: e?.message ?? String(e) }, { status: 500 });
  }
});
