/**
 * Builds a comprehensive deal brief from analysis data, following the investor pitch deck guide.
 * Used by generate-business-deck, lender deck, and other Action Hub generators.
 * Customize output based on actionType and audience.
 */

export type ActionType =
  | "lenderDeck"
  | "businessDeck"
  | "fullAnalysis"
  | "loanProposal"
  | "exportPackage"
  | "notifyTeam";

export type Audience = "internal" | "lender";

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(v: unknown): string {
  const x = n(v);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(x);
}

function pct(v: unknown): string {
  const x = n(v);
  return `${x.toFixed(1)}%`;
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s;
}

/** Lightweight SOW parsing for edge runtime (no external deps) */
function parseSowScope(rehabSow: string | null | undefined): {
  lineItems: Array<{ category: string; item: string; cost: number }>;
  tiers: { budget: number | null; midGrade: number | null; highEnd: number | null };
  timeline: { value: number; unit: string } | null;
} {
  const result = {
    lineItems: [] as Array<{ category: string; item: string; cost: number }>,
    tiers: { budget: null as number | null, midGrade: null as number | null, highEnd: null as number | null },
    timeline: null as { value: number; unit: string } | null,
  };
  if (!rehabSow || typeof rehabSow !== "string") return result;

  const lines = rehabSow.split("\n");
  let currentCategory = "General";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      if (/scope of work/i.test(title)) continue;
      if (/pro flipper|recommendations|remarks/i.test(title)) break;
      currentCategory = title;
      continue;
    }
    if (!line.includes("|")) continue;
    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const first = (cols[0] || "").toLowerCase();
    if (/^-+$/.test(first) || /^item$/i.test(first) || /^est\.?\s*cost$/i.test(first)) continue;
    if (/^(budget|mid-?grade|high-?end|finish level)$/i.test(first)) continue;

    const costMatch = (cols[cols.length - 1] || cols[0]).match(/\$?([\d,]+)/);
    const cost = costMatch ? parseInt(costMatch[1].replace(/,/g, ""), 10) : 0;
    const item = cols[0] || "Line item";
    result.lineItems.push({ category: currentCategory, item, cost: isNaN(cost) ? 0 : cost });
  }

  const tierMatch = rehabSow.match(/\|\s*(?:Budget|Mid-Grade|High-End)\s*\|[^|]*\|\s*\$?([\d,]+)/gi);
  if (tierMatch) {
    for (const m of tierMatch) {
      const label = m.toLowerCase();
      const valMatch = m.match(/\$?([\d,]+)/);
      const val = valMatch ? parseInt(valMatch[1].replace(/,/g, ""), 10) : null;
      if (label.includes("budget") && !label.includes("mid") && !label.includes("high") && val)
        result.tiers.budget = val;
      else if (label.includes("mid")) result.tiers.midGrade = val ?? result.tiers.midGrade;
      else if (label.includes("high")) result.tiers.highEnd = val ?? result.tiers.highEnd;
    }
  }

  const timelineMatch = rehabSow.match(/(?:timeline|duration|estimated)\s*[:\s]+(\d+)\s*(weeks?|months?)/i);
  if (timelineMatch) {
    const unit = (timelineMatch[2] || "weeks").toLowerCase();
    result.timeline = {
      value: parseInt(timelineMatch[1], 10),
      unit: unit.startsWith("month") ? "months" : "weeks",
    };
  }

  return result;
}

export function buildDeckBrief(params: {
  actionType: ActionType;
  audience: Audience;
  deal: Record<string, unknown>;
  metrics: Record<string, unknown>;
  propertyIntelligence?: Record<string, unknown> | null;
  rehabSow?: string | null;
  scenarios?: Record<string, unknown> | null;
  notes?: string | null;
  loanTerms?: { loanAmount?: number; ltvArv?: number; termMonths?: number };
  userInfo?: { name?: string; email?: string; company?: string };
}): string {
  const {
    actionType,
    audience,
    deal,
    metrics,
    propertyIntelligence = null,
    rehabSow,
    scenarios,
    notes,
    loanTerms = {},
    userInfo = {},
  } = params;

  const purchasePrice = n(deal?.purchasePrice ?? deal?.purchase_price ?? metrics?.purchasePrice);
  const rehabBudget = n(deal?.rehab_costs ?? deal?.rehabCosts ?? metrics?.rehab?.total ?? metrics?.rehabCosts);
  const arv = n(deal?.arv ?? metrics?.arv);
  const totalProjectCost = n(metrics?.totalProjectCost ?? metrics?.totalCosts);
  const netProfit = n(metrics?.netProfit);
  const roi = n(metrics?.roi);
  const score = n(metrics?.score);
  const risk = safeStr(metrics?.risk ?? "N/A");

  const comps = (propertyIntelligence?.recentComps ?? []) as Array<Record<string, unknown>>;
  const sowScope = parseSowScope(rehabSow ?? null);

  const ltvArv = loanTerms.ltvArv ?? (arv > 0 ? 80 : 0);
  const requestedLoan = loanTerms.loanAmount ?? (arv > 0 ? Math.round(arv * (ltvArv / 100)) : 0);
  const termMonths = loanTerms.termMonths ?? 12;

  const sections: string[] = [];

  sections.push(`## SLIDE GUIDE (DO NOT REORDER — see SLIDE_STRUCTURE.md in repo)
Fixed AIDA order; \`id\` values below match the DECK PLAN JSON:
1. **title** — Hook: big numbers, location; first impression.
2. **executiveSummary** — Context: investment thesis, KPIs, dual exit (flip + backup hold).
3. **financialOverview** — Money: ROI, profit bridge, cost mix; flip vs illustrative rental only when brief includes both angles—never invent numbers.
4. **loanRequest** — **Lender decks only:** the ask (amount, LTV, term); timeline chart may be present—describe holding sensitivity using brief data only.
5. **marketComparables** — Proof: MLS-style comps; acknowledge gaps if comps missing.
6. **scopeOfWork** — Execution: rehab scope and budget; internal decks may include timeline sensitivity—keep bullets tied to scope and schedule.
7. **riskAssessment** — Honesty: real risks and mitigations; use scenario language from brief when present.
8. **locationMarket** — Why this market: property table + context from brief only.
9. **teamCompany** — Who: track record/contact; use USER INFO section when provided.
10. **investmentSummary** — Recap highlights and reinforcement (recency).
11. **nextSteps** — Clear actions for both sides; low friction.

**Internal (business) decks omit loanRequest**—do not add loan copy to other slides.
`);

  // --- TITLE / PURPOSE ---
  const purpose =
    audience === "lender"
      ? `Create a comprehensive investor pitch deck for ${safeStr(deal?.address) || "this property"} for a hard money loan request.`
      : `Create a professional deal presentation for ${safeStr(deal?.address) || "this property"} for internal review and decision-making.`;
  sections.push(`## PURPOSE\n${purpose}\n`);

  // --- LOAN STRUCTURE (lender-focused) ---
  if (audience === "lender") {
    sections.push(`## LOAN STRUCTURE
- LTV: ${ltvArv}%
- Requested Loan: ${money(requestedLoan)}
- Loan Term: ${termMonths} months
- Renovation Timeline: ${sowScope.timeline ? `${sowScope.timeline.value} ${sowScope.timeline.unit}` : "TBD"}
- Market Exit Timeline: ${sowScope.timeline ? `${sowScope.timeline.value} ${sowScope.timeline.unit}` : "TBD"}
`);
  }

  // --- FINANCIAL OVERVIEW ---
  sections.push(`## FINANCIAL OVERVIEW
- Purchase Price: ${money(purchasePrice)}
- Renovation Budget: ${money(rehabBudget)}
- Total Project Cost: ${money(totalProjectCost)}
- Conservative ARV: ${money(arv)}
- Projected Profit: ${money(netProfit)}
- ROI: ${pct(roi)}
- Deal Score: ${score}/100 • Risk: ${risk}
`);

  // --- PROPERTY DETAILS ---
  const beds = safeStr(deal?.bedrooms ?? propertyIntelligence?.bedrooms);
  const baths = safeStr(deal?.bathrooms ?? propertyIntelligence?.bathrooms);
  const sqft = safeStr(deal?.sqft ?? propertyIntelligence?.squareFootage ?? propertyIntelligence?.sqft);
  const yearBuilt = safeStr(deal?.year_built ?? propertyIntelligence?.yearBuilt);
  const propType = safeStr(propertyIntelligence?.propertyType ?? "Single Family");
  const county = safeStr(propertyIntelligence?.county);
  const schoolDistrict = safeStr(propertyIntelligence?.schoolDistrict);
  const exitStrategy = safeStr(deal?.exit_strategy ?? deal?.exitStrategy);

  sections.push(`## PROPERTY DETAILS
- Type: ${propType || "Single Family"}
- Square Footage: ${sqft || "N/A"} SF
- Bedrooms: ${beds || "N/A"}
- Bathrooms: ${baths || "N/A"}
- Year Built: ${yearBuilt || "N/A"}
- County: ${county || "N/A"}
- School District: ${schoolDistrict || "N/A"}
- Exit Strategy: ${exitStrategy || "Flip"}
`);

  // --- KEY UPGRADES / IMPROVEMENTS (from SOW categories) ---
  if (sowScope.lineItems.length > 0) {
    const categories = [...new Set(sowScope.lineItems.map((r) => r.category))].filter((c) => c !== "General");
    const upgradeBullets = categories.slice(0, 6).map((cat) => {
      const items = sowScope.lineItems.filter((r) => r.category === cat);
      const total = items.reduce((s, i) => s + i.cost, 0);
      return `- ${cat}: ${money(total)} — ${items.map((i) => i.item).slice(0, 2).join("; ")}`;
    });
    sections.push(`## KEY UPGRADES/IMPROVEMENTS\n${upgradeBullets.join("\n")}\n`);
  }

  // --- PROPERTY HIGHLIGHTS (from propertyIntelligence) ---
  const highlights: string[] = [];
  if (county) highlights.push(`Located in ${county}`);
  if (schoolDistrict) highlights.push(`Strong school district: ${schoolDistrict}`);
  if (arv > 0 && purchasePrice > 0) {
    const spread = arv - purchasePrice - rehabBudget;
    if (spread > 0) highlights.push(`Value-add potential: ${money(spread)} spread`);
  }
  if (highlights.length) {
    sections.push(`## PROPERTY HIGHLIGHTS\n${highlights.map((h) => `- ${h}`).join("\n")}\n`);
  }

  // --- RENOVATION SCOPE & BUDGET ---
  if (sowScope.lineItems.length > 0) {
    const byCategory = sowScope.lineItems.reduce((acc, r) => {
      const cat = r.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {} as Record<string, typeof sowScope.lineItems>);
    const scopeLines = Object.entries(byCategory).map(([cat, items]) => {
      const total = items.reduce((s, i) => s + i.cost, 0);
      return `- ${cat}: ${money(total)} — ${items.map((i) => i.item).join(", ")}`;
    });
    const totalScope = sowScope.lineItems.reduce((s, i) => s + i.cost, 0);
    sections.push(`## RENOVATION SCOPE & BUDGET\n${scopeLines.join("\n")}\nTotal: ${money(totalScope)}\n`);
  }

  // --- COMPARABLE SALES ---
  if (Array.isArray(comps) && comps.length > 0) {
    const compLines = comps.slice(0, 5).map((c, i) => {
      const addr = safeStr(c?.address);
      const bedsBaths = `${safeStr(c?.beds ?? c?.bedrooms)} / ${safeStr(c?.baths ?? c?.bathrooms)}`;
      const sqft = safeStr(c?.sqft);
      const price = c?.price ?? c?.salePrice ?? c?.soldPrice;
      const priceStr = money(price);
      const date = safeStr(c?.saleDate ?? c?.sale_date);
      const yearBuilt = safeStr(c?.yearBuilt);
      return `${i + 1}. ${addr} — ${bedsBaths}, ${sqft} SF, Sold ${priceStr} on ${date || "N/A"}, Built ${yearBuilt || "N/A"}`;
    });
    sections.push(`## COMPARABLE SALES\n${compLines.join("\n")}\n`);
  }

  // --- TIMELINE BREAKDOWN ---
  if (sowScope.timeline) {
    sections.push(`## TIMELINE BREAKDOWN
- Estimated renovation: ${sowScope.timeline.value} ${sowScope.timeline.unit}
- Contingency: +1–2 ${sowScope.timeline.unit}
- Marketing & sale: 1–2 months
Total: ~${sowScope.timeline.value + 2} ${sowScope.timeline.unit}
`);
  }

  // --- EXIT STRATEGIES ---
  sections.push(`## EXIT STRATEGIES
- Primary: ${exitStrategy || "Flip"} — Sell after renovation to maximize ROI
- Backup: Rental/Hold — If market softens, hold and rent
`);

  // --- COMPANY INFORMATION (placeholder) ---
  if (userInfo.name || userInfo.email || userInfo.company) {
    sections.push(`## COMPANY INFORMATION
- Company Name: ${safeStr(userInfo.company) || "N/A"}
- Principal: ${safeStr(userInfo.name) || "N/A"}
- Contact Email: ${safeStr(userInfo.email) || "N/A"}
`);
  }

  // --- SLIDE STRUCTURE LOGIC (AIDA) ---
  sections.push(`## SLIDE STRUCTURE LOGIC (follow this order)
1. TITLE (Hook): Big numbers upfront—ROI, ARV, Location. 30-sec impression.
2. EXECUTIVE SUMMARY: Investment thesis, property stats, dual exit. Mental framework.
3. FINANCIAL OVERVIEW: Profit, ROI prominent. Greed/opportunity before fear.
4. LOAN REQUEST (lender): Specific amount, LTV, timeline. Clarity builds confidence.
5. MARKET COMPARABLES: Third-party validation. Recent sales, $/SF.
6. SCOPE OF WORK: Budget breakdown, timeline, contingency. Detail = competence.
7. RISK ASSESSMENT: Acknowledge risks, show mitigations. Honesty builds trust.
8. LOCATION/MARKET: Why this market. Macro trends, demographics.
9. TEAM/COMPANY: Credibility. Contact information.
10. INVESTMENT SUMMARY: Recap highlights. Recency effect.
11. NEXT STEPS: Clear action items. Remove friction.
`);

  // --- DESIGN PREFERENCES ---
  sections.push(`## DESIGN PREFERENCES
- Color Scheme: Investment-friendly (orange/teal for growth, professional)
- Typography: Clear hierarchy—titles 2.5em, numbers 2.2em+, body 1em
- Target: 10–11 slides, clear financial analysis, risk assessment, market comparables
`);

  // --- SPECIAL INSTRUCTIONS ---
  const special: string[] = [];
  if (actionType === "lenderDeck") {
    special.push("Emphasize loan structure and security.");
    special.push("Include clear risk factors and mitigations.");
  }
  if (actionType === "businessDeck" && audience === "internal") {
    special.push("Emphasize deal score and scenario sensitivity.");
  }
  if (!Array.isArray(comps) || comps.length === 0) {
    special.push("Note: No comps available — ARV should be validated against local MLS.");
  }
  if (!rehabSow || rehabSow.trim().length < 30) {
    special.push("Note: Rehab SOW not available — budget is estimate only.");
  }
  if (special.length) {
    sections.push(`## SPECIAL INSTRUCTIONS\n${special.map((s) => `- ${s}`).join("\n")}\n`);
  }

  return sections.join("\n");
}
