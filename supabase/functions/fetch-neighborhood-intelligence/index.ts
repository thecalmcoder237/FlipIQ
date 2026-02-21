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
function getGoogleMapsKey(): string | null {
  return Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim() || null;
}

async function fetchOsmRoadContext(lat: number, lng: number): Promise<Record<string, unknown>> {
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
    const nominatimRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "FlipIQ-Real-Estate-App/1.0" },
    });
    if (!nominatimRes.ok) return {};
    const nominatim = await nominatimRes.json();
    const roadName = nominatim?.address?.road ?? nominatim?.address?.street ?? null;
    const suburb = nominatim?.address?.suburb ?? nominatim?.address?.neighbourhood ?? null;
    const county = nominatim?.address?.county ?? null;
    const state = nominatim?.address?.state ?? null;

    const overpassQuery = `[out:json][timeout:10];way(around:60,${lat},${lng})[highway];out body 5;`;
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    const overpassRes = await fetch(overpassUrl);
    let roadClass = "unknown";
    let speedLimit: string | null = null;
    let lanes: string | null = null;
    let sidewalk: string | null = null;
    let surface: string | null = null;

    if (overpassRes.ok) {
      const overpassData = await overpassRes.json();
      const ways: Array<Record<string, unknown>> = overpassData?.elements ?? [];
      const priorityOrder = ["primary", "secondary", "tertiary", "residential", "unclassified", "service", "living_street"];
      const scoredWays = ways
        .filter((w) => w.tags && typeof (w.tags as Record<string, unknown>).highway === "string")
        .map((w) => {
          const tags = w.tags as Record<string, string>;
          const hw = tags.highway ?? "";
          const priority = priorityOrder.indexOf(hw);
          return { tags, priority: priority === -1 ? 99 : priority };
        })
        .sort((a, b) => a.priority - b.priority);
      if (scoredWays.length > 0) {
        const best = scoredWays[0].tags;
        roadClass = best.highway ?? "unknown";
        speedLimit = best.maxspeed ?? null;
        lanes = best.lanes ?? null;
        sidewalk = best.sidewalk ?? null;
        surface = best.surface ?? null;
      }
    }
    return { roadName, roadClass, speedLimit, lanes, sidewalk, surface, suburb, county, state };
  } catch {
    return {};
  }
}

function interpretRoadClass(roadClass: string): { label: string; trafficRisk: string; riskColor: string; description: string } {
  const map: Record<string, { label: string; trafficRisk: string; riskColor: string; description: string }> = {
    motorway:     { label: "Highway / Interstate",         trafficRisk: "Very High",    riskColor: "red",    description: "Major highway - significant noise and traffic impact on value" },
    trunk:        { label: "Major Arterial Road",          trafficRisk: "Very High",    riskColor: "red",    description: "High-volume trunk road - expect heavy traffic and noise" },
    primary:      { label: "Primary Road (Double Yellow)", trafficRisk: "High",         riskColor: "orange", description: "Main arterial road with double yellow lines - high traffic volume" },
    secondary:    { label: "Secondary Road",               trafficRisk: "Moderate",     riskColor: "yellow", description: "Secondary arterial - moderate traffic, some noise impact" },
    tertiary:     { label: "Neighborhood Collector",       trafficRisk: "Low-Moderate", riskColor: "yellow", description: "Collector street - light to moderate neighborhood traffic" },
    residential:  { label: "Residential Street",           trafficRisk: "Low",          riskColor: "green",  description: "Quiet residential street - minimal traffic, ideal for owner-occupants" },
    living_street:{ label: "Living / Shared Zone",         trafficRisk: "Very Low",     riskColor: "green",  description: "Pedestrian-priority zone - very quiet and walkable" },
    unclassified: { label: "Local Road",                   trafficRisk: "Low",          riskColor: "green",  description: "Low-volume local road" },
    service:      { label: "Service / Access Road",        trafficRisk: "Low",          riskColor: "green",  description: "Access or service road" },
  };
  return map[roadClass] ?? { label: "Unknown Road Type", trafficRisk: "Unknown", riskColor: "gray", description: "Road classification unavailable" };
}

async function fetchNeighborhoodFromOpenAI(
  address: string, city: string | undefined, state: string | undefined,
  zipCode: string, county: string | undefined, roadContext: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = getOpenAIKey();
  const locationStr = [address, city, state ? `${state} ${zipCode}` : zipCode].filter(Boolean).join(", ");
  const roadClassLabel = roadContext.roadClass ? interpretRoadClass(String(roadContext.roadClass)).label : "unknown";

  const prompt = `You are a real estate neighborhood analyst. Analyze this US property location and return a neighborhood intelligence report as a JSON object.

Property: ${locationStr}
County: ${county ?? "unknown"}
Road: ${roadContext.roadName ?? "unknown"} (${roadClassLabel})

Return this exact JSON structure:
{
  "county": "Full county name, State",
  "demographics": {
    "population": "city/area population estimate",
    "medianAge": "median age",
    "medianHouseholdIncome": "$XX,XXX",
    "ownerOccupied": "XX%",
    "renterOccupied": "XX%",
    "diversityIndex": "description"
  },
  "purchasingPower": {
    "medianHomeValue": "$XXX,XXX",
    "medianRent": "$X,XXX/mo",
    "affordabilityRating": "Affordable | Moderate | Expensive | Very Expensive",
    "buyerDemandLevel": "Low | Moderate | High | Very High",
    "investorActivity": "Low | Moderate | High",
    "economicTrend": "one sentence"
  },
  "landmarks": ["4-6 notable landmarks or parks within 2 miles"],
  "neighboringTowns": ["4-6 neighboring cities within 10 miles"],
  "shoppingCenters": ["3-5 shopping centers or retail districts nearby"],
  "schools": [
    { "name": "School Name", "type": "Elementary | Middle | High | Charter", "rating": "X/10 or N/A", "distance": "X.X mi", "notes": "brief note" }
  ],
  "roadImpactAssessment": "2-3 sentences on how road type affects buyer appeal and resale value",
  "neighborhoodVibe": "2-3 sentences describing the area character",
  "investorInsight": "2-3 sentences of strategic insight for a flip or rental investor"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are a real estate neighborhood analyst. Always respond with valid JSON only.",
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
  return JSON.parse(rawText);
}

function buildStreetViewUrl(lat: number, lng: number, key: string): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=640x320&location=${lat},${lng}&fov=90&heading=0&pitch=5&key=${key}`;
}
function buildStaticMapUrl(lat: number, lng: number, key: string): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x320&maptype=roadmap&markers=color:red|${lat},${lng}&key=${key}`;
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const address = String(body?.address ?? "").trim();
    const zipCode = String(body?.zipCode ?? body?.zip_code ?? "").trim().replace(/\D/g, "").slice(0, 5);
    const city = body?.city ? String(body.city).trim() : undefined;
    const stateRaw = body?.state ? String(body.state).trim().slice(0, 2).toUpperCase() : undefined;
    const county = body?.county ? String(body.county).trim() : undefined;
    const lat = body?.lat != null ? Number(body.lat) : null;
    const lng = body?.lng != null ? Number(body.lng) : null;

    if (!address || address.length < 5) {
      return json({ error: "address is required (min 5 characters)" }, { status: 400 });
    }

    const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    const googleMapsKey = getGoogleMapsKey();

    let osmData: Record<string, unknown> = {};
    if (hasCoords) {
      osmData = await fetchOsmRoadContext(lat as number, lng as number);
    }

    const resolvedCounty = county ?? (osmData.county ? String(osmData.county) : undefined);
    const neighborhoodData = await fetchNeighborhoodFromOpenAI(address, city, stateRaw, zipCode, resolvedCounty, osmData);

    const roadClass = String(osmData.roadClass ?? "unknown");
    const roadInterpretation = interpretRoadClass(roadClass);

    const locationIntelligence = {
      roadName:        osmData.roadName ?? null,
      roadClass,
      roadTypeLabel:   roadInterpretation.label,
      trafficRisk:     roadInterpretation.trafficRisk,
      trafficRiskColor:roadInterpretation.riskColor,
      roadDescription: roadInterpretation.description,
      speedLimit:      osmData.speedLimit ?? null,
      lanes:           osmData.lanes ?? null,
      sidewalk:        osmData.sidewalk ?? null,
      surface:         osmData.surface ?? null,
      suburb:          osmData.suburb ?? null,
      streetViewUrl:   (hasCoords && googleMapsKey) ? buildStreetViewUrl(lat as number, lng as number, googleMapsKey) : null,
      staticMapUrl:    (hasCoords && googleMapsKey) ? buildStaticMapUrl(lat as number, lng as number, googleMapsKey) : null,
      hasGoogleMapsKey: !!googleMapsKey,
    };

    return json({
      neighborhood: neighborhoodData,
      location:     locationIntelligence,
      meta: {
        address, city, state: stateRaw, zipCode,
        county: resolvedCounty,
        lat:   hasCoords ? lat : null,
        lng:   hasCoords ? lng : null,
        fetchedAt: new Date().toISOString(),
        sources: ["OpenStreetMap/Overpass", "OpenAI GPT-4o-mini"],
      },
    });
  } catch (e) {
    console.error("[fetch-neighborhood-intelligence] Error:", e);
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});
