/** Deno global provided by Supabase Edge Runtime */
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Promise<Response> | Response): void };

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

function getOpenAIKey(): string {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is required");
  return key;
}

type AddressInput = { index: number; address: string };
type GeocodedResult = { index: number; address: string; latitude: number | null; longitude: number | null };

async function geocodeWithOpenAI(addresses: AddressInput[]): Promise<GeocodedResult[]> {
  const apiKey = getOpenAIKey();

  const addressList = addresses
    .map((a) => `${a.index}. "${a.address}"`)
    .join("\n");

  const prompt = `You are a precise geocoding assistant. Given the following US property addresses, return the approximate latitude and longitude for each one.

Addresses:
${addressList}

Return a JSON object with this exact structure:
{
  "results": [
    { "index": 0, "latitude": 33.7490, "longitude": -84.3880 },
    ...
  ]
}

Rules:
- Use the most accurate coordinates you know for each address
- If you cannot determine coordinates for an address, set latitude and longitude to null
- Return coordinates with at least 4 decimal places
- Only return the JSON object, nothing else`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a geocoding assistant that converts US property addresses to latitude/longitude coordinates. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const result = await response.json();
  const rawText: string = result?.choices?.[0]?.message?.content ?? "";
  if (!rawText) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(rawText);
  const results: GeocodedResult[] = [];

  if (Array.isArray(parsed?.results)) {
    for (const r of parsed.results) {
      const idx = Number(r.index);
      const lat = r.latitude != null ? Number(r.latitude) : null;
      const lng = r.longitude != null ? Number(r.longitude) : null;
      const original = addresses.find((a) => a.index === idx);
      results.push({
        index: idx,
        address: original?.address ?? "",
        latitude: lat != null && Number.isFinite(lat) ? lat : null,
        longitude: lng != null && Number.isFinite(lng) ? lng : null,
      });
    }
  }

  return results;
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const addresses = body?.addresses;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return json({ error: "addresses array is required and must not be empty" }, { status: 400 });
    }

    if (addresses.length > 25) {
      return json({ error: "Maximum 25 addresses per request" }, { status: 400 });
    }

    const inputs: AddressInput[] = addresses
      .map((item: unknown, i: number) => {
        if (typeof item === "string") return { index: i, address: item };
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return { index: obj.index != null ? Number(obj.index) : i, address: String(obj.address ?? "") };
        }
        return null;
      })
      .filter((x): x is AddressInput => x != null && x.address.length > 0);

    if (inputs.length === 0) {
      return json({ error: "No valid addresses provided" }, { status: 400 });
    }

    const results = await geocodeWithOpenAI(inputs);

    return json({
      results,
      source: "openai-gpt-4o-mini",
      geocodedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[geocode-comps] Error:", e);
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});
