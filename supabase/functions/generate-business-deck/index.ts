import { handleCors, json } from "../_shared/cors.ts";
import { buildDeckHtml } from "../_shared/deckTemplates.ts";
import { planDeck } from "../_shared/deckPlanner.ts";
import { buildDeckBrief } from "../_shared/deckBriefBuilder.ts";
import { buildDeckAgentSystemMessage, buildDeckAgentUserPreamble } from "../_shared/deckAgentPrompts.ts";
import { callQwenJson } from "../_shared/llmClients.ts";
import {
  buildCostMixChart,
  buildProfitWaterfallChart,
  buildCompsScatterChart,
  buildCompsPpsfHistogramChart,
  buildScenarioTornadoChart,
  buildTimelineSensitivityChart,
  buildRehabCompositionChart,
  buildKpiTiles,
  pickRankedCompsForDeck,
  type ChartArtifact,
} from "../_shared/chartSpecs.ts";

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function compsStats(propertyIntelligence: any, deal: any, metrics: any) {
  const ranked = pickRankedCompsForDeck(propertyIntelligence, deal, metrics);
  const rows = ranked
    .map((c: any) => {
      const price = n(c?.salePrice ?? c?.price ?? c?.soldPrice);
      const sqft = n(c?.sqft ?? c?.squareFootage ?? c?.square_footage);
      const ppsf = sqft > 0 ? price / sqft : 0;
      return { price, sqft, ppsf };
    })
    .filter((r) => r.price > 0 && r.sqft > 0 && r.ppsf > 0);
  const ppsfArr = rows.map((r: { ppsf: number }) => r.ppsf).sort((a: number, b: number) => a - b);
  const median = ppsfArr.length ? ppsfArr[Math.floor(ppsfArr.length / 2)] : 0;
  return { count: rows.length, medianPpsf: median, rawCompCount: Array.isArray(propertyIntelligence?.recentComps) ? propertyIntelligence.recentComps.length : 0 };
}

function applySlideCopy(deck: any, copy: any) {
  if (!copy || typeof copy !== "object") return deck;
  const byId: Record<string, any> = {};
  if (Array.isArray(copy.slides)) {
    for (const s of copy.slides) {
      if (s?.id) byId[String(s.id)] = s;
    }
  }
  const next = { ...deck };
  next.slides = (deck.slides || []).map((slide: any) => {
    const c = byId[String(slide.id)];
    if (!c) return slide;
    const blocks = (slide.blocks || []).map((b: any) => {
      if (b.kind === "bullets" && Array.isArray(c.bullets) && c.bullets.length) {
        return { ...b, bullets: c.bullets.slice(0, 8) };
      }
      if (b.kind === "title" && (c.title || c.subtitle)) {
        return { ...b, title: c.title || b.title, subtitle: c.subtitle || b.subtitle };
      }
      return b;
    });
    // Add speaker notes as a notes block at end if present
    if (typeof c.speakerNotes === "string" && c.speakerNotes.trim()) {
      blocks.push({ kind: "notes", text: c.speakerNotes.trim().slice(0, 900) });
    }
    return { ...slide, title: c.slideTitle || slide.title, blocks };
  });
  return next;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const actionType = String(body?.actionType ?? body?.action ?? "generateDeck");
    const audience = (String(body?.audience ?? "internal").toLowerCase() === "lender" ? "lender" : "internal") as
      | "internal"
      | "lender";

    const deal = body?.deal ?? {};
    const metrics = body?.metrics ?? {};
    const propertyIntelligence = body?.propertyIntelligence ?? deal?.propertyIntelligence ?? null;
    const rehabSow = body?.rehabSow ?? body?.rehabSOW ?? deal?.rehabSow ?? null;

    let planned = planDeck({
      actionType,
      audience,
      deal,
      metrics,
      propertyIntelligence,
      rehabSow,
      timelineProjections: body?.timelineProjections ?? [],
      userInfo: body?.userInfo
        ? { name: body.userInfo.name, email: body.userInfo.email, company: body.userInfo.company }
        : undefined,
    });

    const deckBrief = buildDeckBrief({
      actionType: (audience === "lender" ? "lenderDeck" : "businessDeck") as "lenderDeck" | "businessDeck",
      audience,
      deal,
      metrics,
      propertyIntelligence,
      rehabSow,
      scenarios: body?.scenarios ?? deal?.scenarios,
      notes: body?.notes ?? deal?.notes,
      loanTerms: body?.loanTerms
        ? {
            loanAmount: body.loanTerms.loanAmount,
            ltvArv: body.loanTerms.ltvArv ?? 80,
            termMonths: body.loanTerms.termMonths ?? 12,
          }
        : undefined,
      userInfo: body?.userInfo
        ? { name: body.userInfo.name, email: body.userInfo.email, company: body.userInfo.company }
        : undefined,
    });

    const charts: ChartArtifact[] = [];

    // Always include KPI tiles (template-rendered)
    charts.push(buildKpiTiles(metrics, deal));

    for (const id of planned.requiredChartIds) {
      if (id === "costMix") charts.push(buildCostMixChart(metrics));
      else if (id === "profitWaterfall") charts.push(buildProfitWaterfallChart(metrics));
      else if (id === "compsScatter") charts.push(buildCompsScatterChart(propertyIntelligence, deal, metrics));
      else if (id === "compsPpsfHistogram") charts.push(buildCompsPpsfHistogramChart(propertyIntelligence, deal, metrics));
      else if (id === "scenarioTornado") charts.push(buildScenarioTornadoChart(metrics));
      else if (id === "rehabComposition") charts.push(buildRehabCompositionChart(metrics));
      else if (id === "timelineSensitivity") charts.push(buildTimelineSensitivityChart(body?.timelineProjections ?? []));
    }

    // --- LLM copy (Qwen draft → OpenAI polish) ---
    const checks: { needs_confirmation: string[]; invariants_failed: string[] } = {
      needs_confirmation: [],
      invariants_failed: [],
    };
    if (!deal?.address) checks.needs_confirmation.push("Missing deal.address");
    if (!n(metrics?.arv)) checks.needs_confirmation.push("Missing/zero ARV (metrics.arv or deal.arv)");
    if (!n(metrics?.purchasePrice)) checks.needs_confirmation.push("Missing/zero purchase price (metrics.purchasePrice)");
    const cs = compsStats(propertyIntelligence, deal, metrics);
    if (!cs.rawCompCount) checks.needs_confirmation.push("No comps available (propertyIntelligence.recentComps)");
    else if (!cs.count) {
      checks.needs_confirmation.push(
        "Comps lack usable price+sqft pairs—refresh comps or verify MLS fields for charts and ARV support.",
      );
    }

    // Pull invariant failures from charts
    for (const c of charts) {
      for (const inv of c.invariants_checked || []) {
        if (typeof inv === "string" && inv.includes("!=")) checks.invariants_failed.push(`${c.id}: ${inv}`);
      }
    }

    const summary = {
      audience,
      actionType,
      deal: {
        address: deal?.address,
        zipCode: deal?.zipCode ?? deal?.zip_code,
        bedrooms: deal?.bedrooms,
        bathrooms: deal?.bathrooms,
        sqft: deal?.sqft,
        exitStrategy: deal?.exit_strategy ?? deal?.exitStrategy,
      },
      metrics: {
        purchasePrice: metrics?.purchasePrice,
        arv: metrics?.arv,
        rehabTotal: metrics?.rehab?.total ?? metrics?.rehabCosts,
        totalProjectCost: metrics?.totalProjectCost,
        sellingTotal: metrics?.selling?.total,
        netProfit: metrics?.netProfit,
        roi: metrics?.roi,
        score: metrics?.score,
        risk: metrics?.risk,
      },
      comps: cs,
    };

    try {
      const system = buildDeckAgentSystemMessage(audience);

      const user = `${buildDeckAgentUserPreamble(audience)}Write slide copy. The Deal Brief starts with SLIDE GUIDE (do not reorder slides)—grounded in SLIDE_STRUCTURE.md.

DEAL BRIEF:
${deckBrief}

DECK PLAN (slide IDs and block kinds—canonical structure):
${JSON.stringify(planned)}

CONTEXT (numeric summary):
${JSON.stringify(summary)}

Return JSON only:
{
  "slides": [
    {"id":"<slideId>","slideTitle":"optional","bullets":["..."],"speakerNotes":"..."}
  ]
}`;

      const model = Deno.env.get("QWEN_MODEL") || "qwen-plus";
      const slideCopy = await callQwenJson({
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        model,
      });
      planned = applySlideCopy(planned, slideCopy);
    } catch (llmErr) {
      // Best-effort: deck still renders with template defaults.
      checks.needs_confirmation.push(`LLM copy unavailable: ${llmErr?.message || String(llmErr)}`);
    }

    const deckHtml = buildDeckHtml({
      deck: planned,
      charts,
      brand: { primary: "#EA580C" },
    });

    return json({
      ok: true,
      deck: planned,
      charts,
      deckHtml,
      qualityChecks: checks,
      slideStructureRef: "SLIDE_STRUCTURE.md",
      slideCount: planned.slides?.length ?? 0,
    });
  } catch (e) {
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
});

