/**
 * Audience-specific LLM framing for deck copy (SLIDE_STRUCTURE.md as framework).
 * Slide order stays in code (planDeck); the model only refines text within guardrails.
 */

export type DeckAgentAudience = "internal" | "lender";

export function buildDeckAgentSystemMessage(audience: DeckAgentAudience): string {
  const purposeBlock =
    audience === "lender"
      ? `PRIMARY PURPOSE (lender deck): Support a loan request with clarity and credibility. Emphasize collateral cushion (ARV/LTV), borrower capacity, documented exit (sale or refi), timeline to repayment, and mitigations. Tone: precise and conservative—no promotional hype; acknowledge uncertainties explicitly.`
      : `PRIMARY PURPOSE (business / internal deck): Enable a fast, evidence-based go/no-go. Emphasize deal score, profit/ROI story, comp and rehab defensibility, scenario range, and honest risks. Tone: analytical and direct—surface data gaps so the team can diligence them.`;

  return `${purposeBlock}

Framework: Product repo SLIDE_STRUCTURE.md — AIDA (Attention → Interest → Desire → Action). Slide order and \`id\` values are FIXED in the DECK PLAN JSON; do not imply reordering or new slides.

Global guardrails:
- Do NOT invent numbers. Only Deal Brief + ContextJSON.
- Missing facts → "TBD", "confirm with MLS", or "not in dataset" — never fabricate sales or financials.
- Bullets ≤ ~12 words each. Speaker notes ≤ ~900 characters per slide.

Per slide id (refine copy only):
- title: Heroic, location-forward; minimal change if titles already strong.
- executiveSummary: Thesis, KPIs, dual exit (flip + hold backup).
- financialOverview: Money narrative; if "Flip vs rental" bullets exist, keep them screening/illustrative—same meaning, tighter wording.
- loanRequest: LENDER DECKS ONLY — amount, LTV, term, security narrative; timeline chart only if brief supports holding sensitivity.
- marketComparables: Comps as third-party proof; call out weak or incomplete comp data if brief does.
- scopeOfWork: Execution credibility, budget, schedule/contingency; align with timeline chart when present.
- riskAssessment: Honest risks + mitigations; tie to scenario data in brief when present.
- locationMarket: Property + market story from brief only—no invented demographics.
- teamCompany: Credibility; use USER INFO from brief when present.
- investmentSummary: Recap, reinforcement, soft CTA.
- nextSteps: Concrete actions; reduce friction to "yes."

Internal decks omit loanRequest — do not add loan language elsewhere.`;
}

export function buildDeckAgentUserPreamble(audience: DeckAgentAudience): string {
  if (audience === "lender") {
    return `AUDIENCE: Lender / capital provider — prioritize repayment path, security, and documentation readiness.\n\n`;
  }
  return `AUDIENCE: Internal sponsor / IC — prioritize decision metrics, risk transparency, and execution plan.\n\n`;
}
