import { pickRankedCompsForDeck } from "./chartSpecs.ts";

export type DeckAudience = "internal" | "lender";

export type SlideBlock =
  | { kind: "title"; title: string; subtitle?: string }
  | { kind: "heroNumbers"; roi?: number; arv?: number; netProfit?: number; location?: string }
  | { kind: "bullets"; title: string; bullets: string[] }
  | { kind: "kpiTiles"; title?: string; chartId: string }
  | { kind: "chart"; title?: string; chartId: string; fullWidth?: boolean }
  | { kind: "table"; title: string; columns: string[]; rows: Array<Array<string | number>> }
  | { kind: "roiBox"; roi: number; label?: string }
  | { kind: "highlightBox"; title: string; content: string }
  | { kind: "notes"; text: string };

export type DeckSlide = {
  id: string;
  title: string;
  layout: "title" | "twoColumn" | "oneColumn" | "chartFocus" | "titleHook";
  blocks: SlideBlock[];
};

export type PlannedDeck = {
  slideCountTarget: { min: number; max: number };
  audience: DeckAudience;
  slides: DeckSlide[];
  requiredChartIds: string[];
};

function hasComps(propertyIntelligence: any): boolean {
  return Array.isArray(propertyIntelligence?.recentComps) && propertyIntelligence.recentComps.length > 0;
}

function hasRehabSow(rehabSow: unknown): boolean {
  return typeof rehabSow === "string" && rehabSow.trim().length > 30;
}

function hasScenario(metrics: any): boolean {
  return metrics?.scenarios?.worstCase && typeof metrics.scenarios.worstCase === "object";
}

function money(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function pct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Matches chartSpecs.buildTimelineSensitivityChart filter (month > 0). */
function hasTimelineData(timelineProjections: unknown): boolean {
  const arr = Array.isArray(timelineProjections) ? timelineProjections : [];
  return arr.some((p: any) => n(p?.month) > 0);
}

/**
 * Illustrative BRRRR/hold cash flow (aligns with client compareExitStrategies / 0.8% rule).
 * Returns null if inputs are insufficient.
 */
function illustrativeMonthlyHoldCashFlow(deal: any, metrics: any): number | null {
  const purchase = n(deal?.purchasePrice ?? deal?.purchase_price ?? metrics?.purchasePrice);
  const arv = n(metrics?.arv ?? deal?.arv);
  if (purchase <= 0 || arv <= 0) return null;
  const fromMetrics = n(metrics?.brrrr?.monthlyCashFlow ?? metrics?.rental?.monthlyCashFlow ?? metrics?.hold?.monthlyCashFlow);
  if (fromMetrics !== 0 && Number.isFinite(fromMetrics)) return fromMetrics;
  const refiAmount = arv * 0.75;
  const estimatedRent = arv * 0.008;
  const r = 0.07 / 12;
  const nMonths = 30 * 12;
  const monthlyPI = refiAmount * (r * Math.pow(1 + r, nMonths)) / (Math.pow(1 + r, nMonths) - 1);
  const expenses = estimatedRent * 0.4;
  return estimatedRent - monthlyPI - expenses;
}

function financialFlipVsRentalBullets(deal: any, metrics: any): string[] | null {
  const netProfit = n(metrics?.netProfit);
  const roi = n(metrics?.roi);
  const mcf = illustrativeMonthlyHoldCashFlow(deal, metrics);
  if (mcf === null) return null;
  return [
    `Flip (primary): ${money(netProfit)} net profit, ${pct(roi)} ROI (from analysis).`,
    `Hold / BRRRR (illustrative): ~${money(mcf)}/mo est. after refi at 75% ARV; screening only.`,
    "Not lending, tax, or investment advice—validate with your professionals.",
  ];
}

/**
 * Slide Structure Logic (11-slide AIDA framework):
 * 1. Title (Hook) - Big numbers, 30-sec impression
 * 2. Executive Summary (Context) - Mental framework
 * 3. Financial Overview (Numbers) - Greed/opportunity before fear
 * 4. Loan Request (Ask) - Lender only
 * 5. Market Comparables (Proof) - Third-party validation
 * 6. Scope of Work (Execution) - Detail = competence
 * 7. Risk Assessment (Honesty) - Controlled honesty builds trust
 * 8. Location/Market (Context) - Why this market
 * 9. Team/Company (Credibility) - People invest in people
 * 10. Investment Summary (Reinforcement) - Recency effect
 * 11. Next Steps (Action) - Remove friction
 */
export function planDeck(params: {
  actionType: string;
  audience: DeckAudience;
  deal: any;
  metrics: any;
  propertyIntelligence?: any;
  rehabSow?: any;
  /** Client-computed rows for timeline chart; see chartSpecs.buildTimelineSensitivityChart */
  timelineProjections?: unknown;
  userInfo?: { name?: string; email?: string; company?: string };
}): PlannedDeck {
  const { actionType, audience, deal, metrics, propertyIntelligence, rehabSow, timelineProjections, userInfo } = params;
  const timelineOk = hasTimelineData(timelineProjections ?? []);
  const compsOk = hasComps(propertyIntelligence);
  const rehabOk = hasRehabSow(rehabSow);
  const scenarioOk = hasScenario(metrics);

  const slides: DeckSlide[] = [];
  const requiredChartIds = new Set<string>();
  const addChart = (chartId: string) => requiredChartIds.add(chartId);

  const roi = n(metrics?.roi);
  const arv = n(metrics?.arv ?? deal?.arv);
  const netProfit = n(metrics?.netProfit);
  const address = safeStr(deal?.address ?? "Deal");
  const exitStrategy = safeStr(deal?.exit_strategy ?? deal?.exitStrategy ?? "Flip");

  // 1) TITLE SLIDE (Hook) - Big numbers upfront, emotional appeal
  slides.push({
    id: "title",
    title: audience === "lender" ? "Investment Loan Package" : "Deal Presentation",
    layout: "titleHook",
    blocks: [
      {
        kind: "title",
        title: audience === "lender" ? "Loan Request & Deal Overview" : "Investment opportunity",
        subtitle: address,
      },
      {
        kind: "heroNumbers",
        roi,
        arv,
        netProfit,
        location: address,
      },
    ],
  });

  // 2) EXECUTIVE SUMMARY (Context) - Investment thesis, property stats, dual exit
  addChart("kpiTiles");
  const execBullets = [
    `Value-add opportunity at ${address}`,
    `Primary exit: ${exitStrategy}. Backup: Rental/Hold if market softens.`,
    "FlipIQ-analyzed deal with provable metrics.",
  ];
  slides.push({
    id: "executiveSummary",
    title: "Executive summary",
    layout: "oneColumn",
    blocks: [
      { kind: "kpiTiles", chartId: "kpiTiles" },
      { kind: "bullets", title: "Investment thesis", bullets: execBullets },
    ],
  });

  // 3) FINANCIAL OVERVIEW (The Numbers) - Profit, ROI; flip + illustrative rental when computable (SLIDE_STRUCTURE.md)
  addChart("profitWaterfall");
  addChart("costMix");
  const flipVsRental = financialFlipVsRentalBullets(deal, metrics);
  const financialBlocks: SlideBlock[] = [
    { kind: "roiBox", roi, label: "Projected ROI" },
    { kind: "chart", title: "Profit bridge", chartId: "profitWaterfall" },
    { kind: "chart", title: "Cost mix", chartId: "costMix" },
  ];
  if (flipVsRental?.length) {
    financialBlocks.push({
      kind: "bullets",
      title: "Flip vs rental (illustrative)",
      bullets: flipVsRental,
    });
  }
  slides.push({
    id: "financialOverview",
    title: "Financial overview",
    layout: "oneColumn",
    blocks: financialBlocks,
  });

  // 4) LOAN REQUEST (The Ask) - Lender only; timeline chart when data (SLIDE_STRUCTURE.md)
  if (audience === "lender") {
    const requestedLoan = arv > 0 ? Math.round(arv * 0.8) : 0;
    if (timelineOk) addChart("timelineSensitivity");
    const loanBlocks: SlideBlock[] = [
      {
        kind: "highlightBox",
        title: "Requested amount",
        content: `${money(requestedLoan)} at 80% LTV (ARV-based). 12-month term.`,
      },
    ];
    if (timelineOk) {
      loanBlocks.push({
        kind: "chart",
        title: "Project timeline sensitivity",
        chartId: "timelineSensitivity",
      });
    }
    loanBlocks.push({
      kind: "bullets",
      title: "Terms",
      bullets: [
        `Primary exit: ${exitStrategy}`,
        "Backup: Rental/Hold if market softens",
        "Attach proof of funds, insurance, borrower profile",
      ],
    });
    slides.push({
      id: "loanRequest",
      title: "Loan request",
      layout: "oneColumn",
      blocks: loanBlocks,
    });
  }

  // 5) MARKET COMPARABLES (Proof) - Third-party validation
  if (compsOk) {
    addChart("compsScatter");
    addChart("compsPpsfHistogram");
    const rawComps = propertyIntelligence.recentComps as Array<Record<string, unknown>>;
    const ranked = pickRankedCompsForDeck(propertyIntelligence, deal, metrics);
    const tableSource = ranked.length > 0 ? ranked.slice(0, 6) : rawComps.slice(0, 6);
    const compTableRows = tableSource.map((c: any) => [
      safeStr(c?.address),
      `${safeStr(c?.beds ?? c?.bedrooms)} / ${safeStr(c?.baths ?? c?.bathrooms)}`,
      safeStr(c?.sqft ?? c?.squareFootage ?? c?.square_footage),
      (c?.price ?? c?.salePrice ?? c?.soldPrice) != null ? money(c?.price ?? c?.salePrice ?? c?.soldPrice) : "—",
      safeStr(c?.saleDate ?? c?.daysOnMarket ?? c?.dom),
    ]);
    const marketBlocks: SlideBlock[] = [
      { kind: "chart", title: "Price vs Sqft", chartId: "compsScatter" },
      { kind: "chart", title: "$/sqft distribution", chartId: "compsPpsfHistogram" },
      {
        kind: "table",
        title: "Recent comps",
        columns: ["Address", "Beds/Baths", "Sqft", "Sold", "Date/DOM"],
        rows: compTableRows,
      },
    ];
    if (ranked.length === 0 && rawComps.length > 0) {
      marketBlocks.push({
        kind: "bullets",
        title: "Comparable data note",
        bullets: [
          "No comps in this feed have both sale price and sqft—charts may be empty.",
          "Replace with MLS-backed comps (price + sqft + date) before lender or investor review.",
        ],
      });
    }
    slides.push({
      id: "marketComparables",
      title: "Market comparables",
      layout: "twoColumn",
      blocks: marketBlocks,
    });
  } else {
    slides.push({
      id: "marketComparables",
      title: "Market comparables",
      layout: "oneColumn",
      blocks: [
        {
          kind: "bullets",
          title: "Data gaps",
          bullets: [
            "Comparable sales were not available at generation time.",
            "ARV justification should be reviewed against local MLS comps.",
          ],
        },
      ],
    });
  }

  // 6) SCOPE OF WORK (Execution Plan) - Budget, timeline chart on internal decks when data (SLIDE_STRUCTURE.md)
  if (audience === "internal" && timelineOk) addChart("timelineSensitivity");

  if (rehabOk) {
    addChart("rehabComposition");
    const sowBlocks: SlideBlock[] = [
      { kind: "chart", title: "Rehab composition", chartId: "rehabComposition" },
      {
        kind: "bullets",
        title: "Scope highlights",
        bullets: [
          "Detailed budget from Rehab SOW in analysis.",
          "Validate line items and contractor bids before committing.",
          "Contingency built into budget.",
        ],
      },
    ];
    if (audience === "internal" && timelineOk) {
      sowBlocks.push({
        kind: "chart",
        title: "Timeline sensitivity (holding period)",
        chartId: "timelineSensitivity",
        fullWidth: true,
      });
    }
    slides.push({
      id: "scopeOfWork",
      title: "Scope of work",
      layout: "twoColumn",
      blocks: sowBlocks,
    });
  } else {
    const fallbackBlocks: SlideBlock[] = [
      {
        kind: "bullets",
        title: "Rehab assumptions",
        bullets: [
          "Rehab SOW not present in analysis dataset.",
          "Budget shown is high-level estimate; confirm with detailed scope.",
        ],
      },
    ];
    if (audience === "internal" && timelineOk) {
      fallbackBlocks.push({
        kind: "chart",
        title: "Timeline sensitivity (holding period)",
        chartId: "timelineSensitivity",
        fullWidth: true,
      });
    }
    slides.push({
      id: "scopeOfWork",
      title: "Scope of work",
      layout: "oneColumn",
      blocks: fallbackBlocks,
    });
  }

  // 7) RISK ASSESSMENT (Honesty) - Acknowledge risks, show mitigations
  if (scenarioOk) {
    addChart("scenarioTornado");
    slides.push({
      id: "riskAssessment",
      title: "Risk assessment",
      layout: "chartFocus",
      blocks: [
        { kind: "chart", chartId: "scenarioTornado" },
        {
          kind: "bullets",
          title: "Mitigations",
          bullets: [
            "ARV sensitivity modeled in scenarios above.",
            "Contingency in rehab budget.",
            "Dual exit strategy reduces market risk.",
          ],
        },
      ],
    });
  } else {
    slides.push({
      id: "riskAssessment",
      title: "Risk assessment",
      layout: "oneColumn",
      blocks: [
        {
          kind: "bullets",
          title: "Key risks",
          bullets: [
            "Market pricing volatility (ARV sensitivity)",
            "Timeline extension and carrying costs",
            "Construction overruns and permit delays",
          ],
        },
        {
          kind: "bullets",
          title: "Mitigations",
          bullets: [
            "Contingency in rehab budget",
            "Dual exit strategy (flip or hold)",
            "Fixed-price contractor approach where possible",
          ],
        },
      ],
    });
  }

  // 8) LOCATION/MARKET (Context) - Why this market
  const zipVal = safeStr(deal?.zipCode ?? deal?.zip_code ?? propertyIntelligence?.zipCode ?? propertyIntelligence?.zip);
  const lotVal = safeStr(deal?.lotSize ?? deal?.lot_size ?? propertyIntelligence?.lotSize ?? propertyIntelligence?.lotAcres);
  const propRows: Array<Array<string | number>> = [
    ["Address", address],
    ["Zip", zipVal],
    ["Beds / Baths", `${safeStr(deal?.bedrooms ?? propertyIntelligence?.bedrooms)} / ${safeStr(deal?.bathrooms ?? propertyIntelligence?.bathrooms)}`],
    ["Sqft", safeStr(deal?.sqft ?? propertyIntelligence?.squareFootage ?? propertyIntelligence?.sqft)],
    ["Lot size", lotVal],
    ["Year Built", safeStr(deal?.year_built ?? propertyIntelligence?.yearBuilt)],
    ["Property Type", safeStr(propertyIntelligence?.propertyType ?? "Single Family")],
    ["County", safeStr(propertyIntelligence?.county)],
    ["School District", safeStr(propertyIntelligence?.schoolDistrict)],
  ];
  slides.push({
    id: "locationMarket",
    title: "Location & market",
    layout: "oneColumn",
    blocks: [
      {
        kind: "table",
        title: "Property details",
        columns: ["Field", "Value"],
        rows: propRows,
      },
      {
        kind: "bullets",
        title: "Market context",
        bullets: [
          propertyIntelligence?.county ? `Located in ${propertyIntelligence.county}` : "Local market data available in full analysis",
          propertyIntelligence?.schoolDistrict ? `Strong school district: ${propertyIntelligence.schoolDistrict}` : "Review school district for target buyer appeal",
        ].filter(Boolean),
      },
    ],
  });

  // 9) TEAM/COMPANY (Credibility) — userInfo from Action Hub when provided (SLIDE_STRUCTURE.md)
  const teamBullets: string[] = [];
  const co = userInfo?.company && String(userInfo.company).trim();
  const nm = userInfo?.name && String(userInfo.name).trim();
  const em = userInfo?.email && String(userInfo.email).trim();
  if (co) teamBullets.push(`Company: ${co}`);
  if (nm) teamBullets.push(`Contact: ${nm}`);
  if (em) teamBullets.push(`Email: ${em}`);
  if (teamBullets.length === 0) {
    teamBullets.push(
      "Generated by FlipIQ Deal Analysis",
      "Add your company name, principal, and contact info before sharing externally.",
      "Review full analysis for complete deal details.",
    );
  } else {
    teamBullets.push("FlipIQ Deal Analysis — metrics and comps sourced from your workspace.");
  }
  slides.push({
    id: "teamCompany",
    title: "Team & company",
    layout: "oneColumn",
    blocks: [
      {
        kind: "bullets",
        title: "Contact",
        bullets: teamBullets,
      },
    ],
  });

  // 10) INVESTMENT SUMMARY (Reinforcement) - Recap highlights
  slides.push({
    id: "investmentSummary",
    title: "Investment summary",
    layout: "oneColumn",
    blocks: [
      {
        kind: "highlightBox",
        title: "Key highlights",
        content: `${pct(roi)} ROI • ${money(netProfit)} projected profit • ${money(arv)} ARV • ${address}`,
      },
      {
        kind: "bullets",
        title: "Recap",
        bullets: [
          `Primary exit: ${exitStrategy}`,
          "FlipIQ-analyzed with provable metrics",
          "Review full analysis for complete details",
        ],
      },
    ],
  });

  // 11) NEXT STEPS (Action) - Clear action items
  slides.push({
    id: "nextSteps",
    title: "Next steps",
    layout: "oneColumn",
    blocks: [
      {
        kind: "bullets",
        title: "Action items",
        bullets: [
          "Review full FlipIQ analysis (shared link)",
          "Validate comps against local MLS",
          "Confirm rehab scope with contractor bids",
          "Contact when ready to proceed",
        ],
      },
    ],
  });

  const target = { min: 10, max: 11 };

  return {
    slideCountTarget: target,
    audience,
    slides,
    requiredChartIds: Array.from(requiredChartIds),
  };
}
