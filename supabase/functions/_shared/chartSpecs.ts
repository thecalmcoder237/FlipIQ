type FieldSource = {
  field: string;
  source: string; // e.g. "metrics.totalProjectCost"
  notes?: string;
};

export type ChartArtifact = {
  id: string;
  chartType:
    | "kpiTiles"
    | "costMix"
    | "profitWaterfall"
    | "compsScatter"
    | "compsPpsfHistogram"
    | "scenarioTornado"
    | "timelineSensitivity"
    | "rehabComposition";
  title: string;
  data_rows: unknown[];
  /**
   * Vega-Lite spec (JSON). Rendering happens downstream.
   * We keep this portable so a renderer can output SVG for crisp PDFs.
   */
  spec: Record<string, unknown>;
  field_sources: FieldSource[];
  formulas_used: string[];
  invariants_checked: string[];
  warnings?: string[];
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function clampLabel(s: string, max = 60) {
  const t = String(s ?? "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Comps usable for scatter, $/sf, and deck table: require price + sqft (SLIDE_STRUCTURE.md proof slide).
 * Ranked by distance when present, then sqft proximity to subject, preferring prices in a loose ARV band.
 */
export function pickRankedCompsForDeck(propertyIntelligence: any, deal: any, metrics: any): any[] {
  const comps = safeArr<any>(propertyIntelligence?.recentComps);
  const subjectSqft = n(
    deal?.sqft ?? deal?.squareFootage ?? propertyIntelligence?.sqft ?? propertyIntelligence?.squareFootage,
  );
  const arv = n(metrics?.arv ?? deal?.arv);

  const enriched = comps.map((c) => {
    const price = n(c?.salePrice ?? c?.price ?? c?.soldPrice ?? c?.sold_price);
    const sqft = n(c?.sqft ?? c?.squareFootage ?? c?.square_footage);
    const distance = c?.distance != null ? n(c.distance) : null;
    return { raw: c, price, sqft, distance };
  }).filter((r) => r.price > 0 && r.sqft > 0);

  if (enriched.length === 0) return [];

  const inArvBand = (price: number) =>
    arv <= 0 ? true : price >= arv * 0.22 && price <= arv * 1.6;
  const banded = enriched.filter((r) => inArvBand(r.price));
  const pool = banded.length >= 2 ? banded : enriched;

  pool.sort((a, b) => {
    if (a.distance != null && b.distance != null && a.distance !== b.distance) return a.distance - b.distance;
    if (a.distance != null && b.distance == null) return -1;
    if (a.distance == null && b.distance != null) return 1;
    if (subjectSqft > 400) {
      return Math.abs(a.sqft - subjectSqft) - Math.abs(b.sqft - subjectSqft);
    }
    return b.price - a.price;
  });

  return pool.map((r) => r.raw);
}

function invariantEqual(label: string, a: number, b: number, tol = 1e-6): string | null {
  if (Math.abs(a - b) <= tol) return null;
  return `${label} (expected equality): ${a} != ${b}`;
}

export function buildKpiTiles(metrics: any, deal: any): ChartArtifact {
  const rows = [
    { label: "Address", value: String(deal?.address ?? "") },
    { label: "Purchase", value: n(metrics?.purchasePrice ?? deal?.purchasePrice ?? deal?.purchase_price) },
    { label: "ARV", value: n(metrics?.arv ?? deal?.arv) },
    { label: "Rehab", value: n(metrics?.rehab?.total ?? metrics?.rehabCosts ?? deal?.rehabCosts ?? deal?.rehab_costs) },
    { label: "Total project cost", value: n(metrics?.totalProjectCost) },
    { label: "Net profit", value: n(metrics?.netProfit) },
    { label: "ROI", value: n(metrics?.roi) },
    { label: "Score", value: n(metrics?.score) },
    { label: "Risk", value: String(metrics?.risk ?? "") },
  ];

  return {
    id: "kpiTiles",
    chartType: "kpiTiles",
    title: "Key metrics",
    data_rows: rows,
    spec: {}, // rendering handled by deck template (not a chart)
    field_sources: [
      { field: "deal.address", source: "deal.address" },
      { field: "purchasePrice", source: "metrics.purchasePrice (fallback deal.purchasePrice/purchase_price)" },
      { field: "arv", source: "metrics.arv (fallback deal.arv)" },
      { field: "rehab", source: "metrics.rehab.total (fallback metrics.rehabCosts/deal.rehabCosts)" },
      { field: "totalProjectCost", source: "metrics.totalProjectCost" },
      { field: "netProfit", source: "metrics.netProfit" },
      { field: "roi", source: "metrics.roi" },
      { field: "score", source: "metrics.score" },
      { field: "risk", source: "metrics.risk" },
    ],
    formulas_used: [],
    invariants_checked: [],
  };
}

export function buildCostMixChart(metrics: any): ChartArtifact {
  const purchasePrice = n(metrics?.purchasePrice);
  const acquisitionFeesOnly = n(metrics?.acquisition?.feesOnly);
  const hardMoney = n(metrics?.hardMoney?.total);
  const rehab = n(metrics?.rehab?.total ?? metrics?.rehabCosts);
  const holding = n(metrics?.holding?.total);
  const selling = n(metrics?.selling?.total);

  const totalProjectCost = n(metrics?.totalProjectCost);
  const totalAllCosts = totalProjectCost + selling;

  const rows = [
    { category: "Purchase & Acquisition", amount: purchasePrice + acquisitionFeesOnly },
    { category: "Hard Money", amount: hardMoney },
    { category: "Rehab", amount: rehab },
    { category: "Holding", amount: holding },
    { category: "Selling", amount: selling },
  ].filter((r) => n(r.amount) > 0);

  const sum = rows.reduce((acc, r) => acc + n(r.amount), 0);
  const inv: string[] = [];
  const mismatch = invariantEqual("sum(costMix) == totalAllCosts", sum, totalAllCosts, 0.5);
  if (mismatch) inv.push(mismatch);

  return {
    id: "costMix",
    chartType: "costMix",
    title: "Where the money goes (cost mix)",
    data_rows: rows.map((r) => ({ ...r, pct: totalAllCosts > 0 ? (n(r.amount) / totalAllCosts) * 100 : 0 })),
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      mark: { type: "bar" },
      encoding: {
        y: { field: "category", type: "nominal", sort: "-x", title: null },
        x: { field: "amount", type: "quantitative", title: "Amount ($)" },
        color: { field: "category", type: "nominal", legend: null },
        tooltip: [
          { field: "category", type: "nominal" },
          { field: "amount", type: "quantitative", format: ",.0f" },
          { field: "pct", type: "quantitative", format: ".1f" },
        ],
      },
    },
    field_sources: [
      { field: "purchasePrice", source: "metrics.purchasePrice" },
      { field: "acquisitionFeesOnly", source: "metrics.acquisition.feesOnly" },
      { field: "hardMoney", source: "metrics.hardMoney.total" },
      { field: "rehab", source: "metrics.rehab.total (fallback metrics.rehabCosts)" },
      { field: "holding", source: "metrics.holding.total" },
      { field: "selling", source: "metrics.selling.total" },
      { field: "totalProjectCost", source: "metrics.totalProjectCost" },
    ],
    formulas_used: ["totalAllCosts = metrics.totalProjectCost + metrics.selling.total", "pct = amount / totalAllCosts * 100"],
    invariants_checked: inv.length ? inv : ["sum(costMix) == totalAllCosts (within tolerance)"],
    warnings: sum <= 0 ? ["No positive cost components found."] : undefined,
  };
}

export function buildProfitWaterfallChart(metrics: any): ChartArtifact {
  const arv = n(metrics?.arv);
  const totalProjectCost = n(metrics?.totalProjectCost);
  const selling = n(metrics?.selling?.total);
  const netProfit = n(metrics?.netProfit);

  const inv: string[] = [];
  const expectedNet = arv - totalProjectCost - selling;
  const mismatch = invariantEqual("netProfit == arv - totalProjectCost - selling", netProfit, expectedNet, 1);
  if (mismatch) inv.push(mismatch);

  const rows = [
    { step: "ARV", kind: "start", amount: arv },
    { step: "Total Project Cost", kind: "down", amount: totalProjectCost },
    { step: "Selling Costs", kind: "down", amount: selling },
    { step: "Net Profit", kind: "end", amount: netProfit },
  ];

  // Vega-Lite “waterfall” via running sum is doable; keep spec simple for now.
  return {
    id: "profitWaterfall",
    chartType: "profitWaterfall",
    title: "Profit bridge (ARV → Net Profit)",
    data_rows: rows,
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      transform: [
        { window: [{ op: "sum", field: "amount", as: "running" }], frame: [null, 0] },
      ],
      mark: { type: "bar" },
      encoding: {
        x: { field: "step", type: "nominal", sort: null, title: null },
        y: { field: "amount", type: "quantitative", title: "Amount ($)" },
        color: { field: "kind", type: "nominal", legend: null },
        tooltip: [
          { field: "step", type: "nominal" },
          { field: "amount", type: "quantitative", format: ",.0f" },
        ],
      },
    },
    field_sources: [
      { field: "arv", source: "metrics.arv" },
      { field: "totalProjectCost", source: "metrics.totalProjectCost" },
      { field: "selling", source: "metrics.selling.total" },
      { field: "netProfit", source: "metrics.netProfit" },
    ],
    formulas_used: ["expectedNetProfit = arv - totalProjectCost - selling"],
    invariants_checked: inv.length ? inv : ["netProfit == arv - totalProjectCost - selling (within tolerance)"],
  };
}

export function buildCompsScatterChart(propertyIntelligence: any, deal?: any, metrics?: any): ChartArtifact {
  const comps = pickRankedCompsForDeck(propertyIntelligence, deal ?? {}, metrics ?? {});
  const rows = comps
    .map((c, i) => {
      const price = n(c?.salePrice ?? c?.price ?? c?.soldPrice ?? c?.sold_price);
      const sqft = n(c?.sqft ?? c?.squareFootage ?? c?.square_footage);
      const dom = c?.dom ?? c?.daysOnMarket ?? c?.days_on_market;
      const distance = c?.distance;
      return {
        idx: i + 1,
        address: clampLabel(c?.address ?? "", 80),
        price,
        sqft,
        ppsf: sqft > 0 ? price / sqft : 0,
        dom: dom == null ? null : n(dom),
        distance: distance == null ? null : n(distance),
      };
    })
    .filter((r) => r.price > 0 && r.sqft > 0);

  return {
    id: "compsScatter",
    chartType: "compsScatter",
    title: "Comps: price vs sqft",
    data_rows: rows,
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      mark: { type: "point", filled: true, size: 90, opacity: 0.85 },
      encoding: {
        x: { field: "sqft", type: "quantitative", title: "Sqft" },
        y: { field: "price", type: "quantitative", title: "Sale price ($)" },
        color: {
          field: "dom",
          type: "quantitative",
          title: "DOM",
          // Vega built-in scheme (orangeblue is not recognized by Vega).
          scale: { scheme: "blueorange" },
        },
        tooltip: [
          { field: "address", type: "nominal" },
          { field: "price", type: "quantitative", format: ",.0f" },
          { field: "sqft", type: "quantitative", format: ",.0f" },
          { field: "ppsf", type: "quantitative", format: ",.0f" },
          { field: "dom", type: "quantitative" },
          { field: "distance", type: "quantitative", format: ".2f" },
        ],
      },
    },
    field_sources: [
      { field: "comps", source: "propertyIntelligence.recentComps[]" },
      { field: "price", source: "comp.salePrice || comp.price || comp.soldPrice" },
      { field: "sqft", source: "comp.sqft" },
      { field: "dom", source: "comp.dom || comp.daysOnMarket" },
      { field: "distance", source: "comp.distance" },
    ],
    formulas_used: ["ppsf = price / sqft"],
    invariants_checked: ["Filtered: price>0 and sqft>0"],
    warnings: rows.length === 0 ? ["No comps with both price and sqft available."] : undefined,
  };
}

export function buildRehabCompositionChart(metrics: any): ChartArtifact {
  const rehab = metrics?.rehab ?? {};
  const rows = [
    { component: "Base Budget", amount: n(rehab.baseRehab) },
    { component: "Contingency", amount: n(rehab.contingency) },
    { component: "Overruns", amount: n(rehab.overrun) },
    { component: "Permits", amount: n(rehab.permitFees) },
  ].filter((r) => r.amount > 0);

  const total = n(rehab.total ?? metrics?.rehabCosts);
  const sum = rows.reduce((a, r) => a + r.amount, 0);
  const inv: string[] = [];
  const mismatch = invariantEqual("sum(rehabComponents) == rehabTotal", sum, total, 1);
  if (mismatch) inv.push(mismatch);

  return {
    id: "rehabComposition",
    chartType: "rehabComposition",
    title: "Rehab budget composition",
    data_rows: rows.map((r) => ({ ...r, pct: total > 0 ? (r.amount / total) * 100 : 0 })),
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      mark: "bar",
      encoding: {
        x: { field: "component", type: "nominal", title: null, sort: null },
        y: { field: "amount", type: "quantitative", title: "Amount ($)" },
        tooltip: [
          { field: "component", type: "nominal" },
          { field: "amount", type: "quantitative", format: ",.0f" },
          { field: "pct", type: "quantitative", format: ".1f" },
        ],
      },
    },
    field_sources: [
      { field: "baseRehab", source: "metrics.rehab.baseRehab" },
      { field: "contingency", source: "metrics.rehab.contingency" },
      { field: "overrun", source: "metrics.rehab.overrun" },
      { field: "permitFees", source: "metrics.rehab.permitFees" },
      { field: "rehabTotal", source: "metrics.rehab.total (fallback metrics.rehabCosts)" },
    ],
    formulas_used: ["pct = component / rehabTotal * 100"],
    invariants_checked: inv.length ? inv : ["sum(rehabComponents) == rehabTotal (within tolerance)"],
    warnings: total <= 0 ? ["Rehab total is 0; composition chart may be empty."] : undefined,
  };
}

export function buildCompsPpsfHistogramChart(propertyIntelligence: any, deal?: any, metrics?: any): ChartArtifact {
  const comps = pickRankedCompsForDeck(propertyIntelligence, deal ?? {}, metrics ?? {});
  const rows = comps
    .map((c) => {
      const price = n(c?.salePrice ?? c?.price ?? c?.soldPrice ?? c?.sold_price);
      const sqft = n(c?.sqft ?? c?.squareFootage ?? c?.square_footage);
      const ppsf = sqft > 0 ? price / sqft : 0;
      return { ppsf };
    })
    .filter((r) => r.ppsf > 0);

  return {
    id: "compsPpsfHistogram",
    chartType: "compsPpsfHistogram",
    title: "Comps: $/sqft distribution",
    data_rows: rows,
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      mark: "bar",
      encoding: {
        x: { field: "ppsf", type: "quantitative", bin: true, title: "$/sqft" },
        y: { aggregate: "count", type: "quantitative", title: "Count" },
        tooltip: [{ aggregate: "count", type: "quantitative", title: "Count" }],
      },
    },
    field_sources: [
      { field: "comps", source: "propertyIntelligence.recentComps[]" },
      { field: "price", source: "comp.salePrice || comp.price || comp.soldPrice" },
      { field: "sqft", source: "comp.sqft" },
    ],
    formulas_used: ["ppsf = price / sqft", "histogram bins computed by renderer"],
    invariants_checked: ["Filtered: ppsf>0"],
    warnings: rows.length === 0 ? ["No comps with computable $/sqft."] : undefined,
  };
}

export function buildScenarioTornadoChart(metrics: any): ChartArtifact {
  const baseProfit = n(metrics?.netProfit);
  const worst = metrics?.scenarios?.worstCase ?? {};
  const rows = [
    { scenario: "Market crash", scenarioKey: "marketCrash", netProfit: n(worst.marketCrash) },
    { scenario: "Major repair", scenarioKey: "majorRepair", netProfit: n(worst.majorRepair) },
    { scenario: "Extended timeline", scenarioKey: "extendedTimeline", netProfit: n(worst.extendedTimeline) },
    { scenario: "Financing fallthrough", scenarioKey: "financingFallthrough", netProfit: n(worst.financingFallthrough) },
  ]
    .filter((r) => Number.isFinite(r.netProfit) && r.netProfit !== 0)
    .map((r) => ({ ...r, delta: r.netProfit - baseProfit }));

  return {
    id: "scenarioTornado",
    chartType: "scenarioTornado",
    title: "Downside scenarios (impact on net profit)",
    data_rows: rows,
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      mark: "bar",
      encoding: {
        y: { field: "scenario", type: "nominal", sort: "x", title: null },
        x: { field: "delta", type: "quantitative", title: "Δ Net profit ($)" },
        color: {
          condition: { test: "datum.delta < 0", value: "#DC2626" },
          value: "#16A34A",
        },
        tooltip: [
          { field: "scenario", type: "nominal" },
          { field: "netProfit", type: "quantitative", format: ",.0f", title: "Scenario net profit" },
          { field: "delta", type: "quantitative", format: ",.0f", title: "Δ vs base" },
        ],
      },
    },
    field_sources: [
      { field: "baseNetProfit", source: "metrics.netProfit" },
      { field: "worstCaseScenarioProfits", source: "metrics.scenarios.worstCase" },
    ],
    formulas_used: ["delta = scenarioNetProfit - baseNetProfit"],
    invariants_checked: ["Uses calculateDealMetrics -> simulateWorstCase outputs when present"],
    warnings: rows.length === 0 ? ["No scenario data found in metrics.scenarios.worstCase."] : undefined,
  };
}

export function buildTimelineSensitivityChart(timelineProjections: any): ChartArtifact {
  const rows = safeArr<any>(timelineProjections)
    .map((p) => ({ month: n(p?.month), netProfit: n(p?.profit ?? p?.netProfit) }))
    .filter((r) => r.month > 0);

  return {
    id: "timelineSensitivity",
    chartType: "timelineSensitivity",
    title: "Timeline sensitivity (net profit vs holding months)",
    data_rows: rows,
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { name: "table" },
      mark: { type: "line", point: true },
      encoding: {
        x: { field: "month", type: "quantitative", title: "Holding months" },
        y: { field: "netProfit", type: "quantitative", title: "Net profit ($)" },
        tooltip: [
          { field: "month", type: "quantitative" },
          { field: "netProfit", type: "quantitative", format: ",.0f" },
        ],
      },
    },
    field_sources: [{ field: "timelineProjections", source: "client-computed calculateTimelineProjections(deal, metrics)" }],
    formulas_used: ["Provided projections are treated as ground truth; renderer plots month vs netProfit"],
    invariants_checked: ["Filtered: month>0"],
    warnings: rows.length === 0 ? ["No timeline projections provided."] : undefined,
  };
}

