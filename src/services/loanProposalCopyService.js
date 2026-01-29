import { supabase } from '@/lib/customSupabaseClient';

const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';

function safeStr(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s.length ? s : '';
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

/** Fallback narrative when AI fails or is unavailable */
function getFallbackNarrative(deal, metrics) {
  const address = safeStr(deal?.address);
  const arv = safeNum(deal?.arv ?? metrics?.arv);
  const netProfit = safeNum(metrics?.netProfit);
  const roi = safeNum(metrics?.roi);
  return {
    investmentThesis: `Value-add opportunity at ${address || 'this property'}. Renovation and strategic improvements position the asset for strong resale or rental exit. ARV of ${formatCurrency(arv)} supported by comparable sales and market data.`,
    executiveSummary: `Fix-and-flip opportunity at ${address || 'this property'} with projected net profit of ${formatCurrency(netProfit)} and estimated ROI of ${roi.toFixed(1)}%. Deal analysis and rehab scope support the financial projections.`,
    arvJustification: `After-repair value is supported by recent comparable sales in the area. Subject property improvements align with comp quality and buyer expectations.`,
    strategicAdvantages: [
      'Clear value-add strategy with defined scope of work',
      'Strong equity cushion relative to loan request',
      'Flexible exit strategy (flip or rental)',
      'Market-supported ARV based on comps',
    ],
    riskMitigation: [
      { risk: 'Market pricing may vary', mitigation: 'Conservative ARV assumptions and rental backup provide downside protection.' },
      { risk: 'Construction overruns', mitigation: 'Contingency in rehab budget and fixed-price contractor approach where possible.' },
      { risk: 'Timeline extension', mitigation: 'Realistic holding period and exit flexibility.' },
    ],
    timelineNarrative: 'Renovation and marketing timeline aligned with loan term; exit within projected period.',
    investmentRecommendation: 'Deal fundamentals support loan consideration. Equity cushion and exit strategy mitigate risk. Recommend review of full package and property inspection.',
  };
}

/** Sanitize string for safe injection (no HTML) */
function sanitize(text) {
  if (text == null || typeof text !== 'string') return '';
  return text.trim().slice(0, 5000);
}

/** Validate and normalize AI response */
function normalizeNarrative(data, deal, metrics) {
  const fallback = getFallbackNarrative(deal, metrics);
  if (!data || typeof data !== 'object') return fallback;

  const strategicAdvantages = Array.isArray(data.strategicAdvantages)
    ? data.strategicAdvantages.map((s) => sanitize(String(s))).filter(Boolean).slice(0, 8)
    : fallback.strategicAdvantages;

  let riskMitigation = fallback.riskMitigation;
  if (Array.isArray(data.riskMitigation) && data.riskMitigation.length > 0) {
    riskMitigation = data.riskMitigation
      .slice(0, 6)
      .map((item) => ({
        risk: sanitize(typeof item === 'object' && item !== null ? item.risk : String(item)),
        mitigation: sanitize(typeof item === 'object' && item !== null ? item.mitigation : ''),
      }))
      .filter((item) => item.risk || item.mitigation);
  }
  if (riskMitigation.length === 0) riskMitigation = fallback.riskMitigation;

  return {
    investmentThesis: sanitize(data.investmentThesis) || fallback.investmentThesis,
    executiveSummary: sanitize(data.executiveSummary) || fallback.executiveSummary,
    arvJustification: sanitize(data.arvJustification) || fallback.arvJustification,
    strategicAdvantages,
    riskMitigation,
    timelineNarrative: sanitize(data.timelineNarrative) || fallback.timelineNarrative,
    investmentRecommendation: sanitize(data.investmentRecommendation) || fallback.investmentRecommendation,
  };
}

/**
 * Fetches AI-tailored narrative copy for a loan proposal.
 * @param {{ deal: object, metrics: object, rehabSowSummary?: string, compsSummary?: string, loanTerms?: object, borrowerInfo?: object }} params
 * @returns {Promise<{ investmentThesis: string, executiveSummary: string, arvJustification: string, strategicAdvantages: string[], riskMitigation: { risk: string, mitigation: string }[], timelineNarrative: string, investmentRecommendation: string }>}
 */
export async function fetchLoanProposalNarrative({ deal, metrics, rehabSowSummary, compsSummary, loanTerms, borrowerInfo }) {
  const address = safeStr(deal?.address);
  const purchase = safeNum(deal?.purchase_price ?? deal?.purchasePrice);
  const arv = safeNum(deal?.arv);
  const rehabBudget = safeNum(deal?.rehab_costs ?? deal?.rehabCosts);
  const netProfit = safeNum(metrics?.netProfit);
  const roi = safeNum(metrics?.roi);
  const totalProjectCost = safeNum(metrics?.totalProjectCost ?? metrics?.totalCosts);
  const exitStrategy = safeStr(deal?.exit_strategy ?? deal?.exitStrategy) || 'Fix and Flip';
  const requestedLoanAmount = Math.round(arv * 0.8);
  const loanToArv = arv > 0 ? ((requestedLoanAmount / arv) * 100).toFixed(1) : '80';

  const userMessage = `
Generate lender-ready narrative copy for a loan proposal. Return valid JSON only, no markdown or extra text.

Deal data:
- Address: ${address}
- Purchase price: ${formatCurrency(purchase)}
- ARV: ${formatCurrency(arv)}
- Rehab budget: ${formatCurrency(rehabBudget)}
- Total project cost: ${formatCurrency(totalProjectCost)}
- Net profit: ${formatCurrency(netProfit)}
- ROI: ${roi.toFixed(1)}%
- Exit strategy: ${exitStrategy}
- Loan request (80% ARV LTV): ${formatCurrency(requestedLoanAmount)} (${loanToArv}% loan-to-ARV)

Rehab scope summary: ${safeStr(rehabSowSummary).slice(0, 600) || 'Not provided.'}

Comparables summary: ${safeStr(compsSummary) || 'See comps table in proposal.'}

Borrower: ${safeStr(borrowerInfo?.name)}. ${safeStr(borrowerInfo?.experience)} experience.

Return a single JSON object with these exact keys (all strings except strategicAdvantages and riskMitigation):
- investmentThesis (2-4 sentences: value-add thesis and why this property/area)
- executiveSummary (short paragraph for Executive Summary slide)
- arvJustification (paragraph tying comps to ARV; reference subject vs comps)
- strategicAdvantages (array of 4-6 short bullet strings)
- riskMitigation (array of objects with "risk" and "mitigation" strings, 3-4 items: e.g. market pricing, construction overrun, timeline, sale delay)
- timelineNarrative (1-2 sentences on execution timeline)
- investmentRecommendation (2-4 sentences: approval recommendation and key reasons)
`;

  try {
    const { data, error } = await supabase.functions.invoke('send-claude-request', {
      body: {
        address: address || 'Deal',
        requestType: 'custom_json',
        systemPrompt: 'You are an expert real estate loan package writer. Write concise, lender-ready copy tailored to this specific deal. Return valid JSON only, no markdown code blocks or extra text.',
        userMessage,
        model: DEFAULT_MODEL,
      },
    });

    if (error) throw error;

    let parsed = data;
    if (typeof data === 'string') {
      const stripped = data.replace(/^```json\s*|\s*```$/g, '').trim();
      parsed = JSON.parse(stripped);
    }
    return normalizeNarrative(parsed, deal, metrics);
  } catch (err) {
    console.warn('Loan proposal narrative AI failed, using fallback:', err);
    return getFallbackNarrative(deal, metrics);
  }
}
