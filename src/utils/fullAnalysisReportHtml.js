/**
 * Generates Full Deal Analysis as HTML (alternative to PDF when export has issues).
 * Uses FlipIQ orange styling (#EA580C) to match deck and loan proposal.
 */
import { formatCurrency } from '@/utils/proposalTemplate';
import { calculate70RuleMAO } from '@/utils/advancedDealCalculations';
import { parseSOWLineItems, extractSOWRemarks } from '@/utils/sowParser';

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function safeStr(v) {
  if (v === null || v === undefined) return 'N/A';
  const s = String(v).trim();
  return s.length ? s : 'N/A';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateFullAnalysisReportHtml({
  deal,
  metrics,
  propertyIntelligence,
  rehabSow,
  scenarios,
  notes,
  shareUrl,
}) {
  const score = safeNum(metrics?.score);
  const risk = safeStr(metrics?.risk);
  const netProfit = safeNum(metrics?.netProfit);
  const roi = safeNum(metrics?.roi);
  const arv = safeNum(metrics?.arv ?? deal?.arv);
  const purchase = safeNum(deal?.purchasePrice ?? deal?.purchase_price);
  const rehab = safeNum(deal?.rehab_costs ?? deal?.rehabCosts);
  const mao = arv > 0 ? calculate70RuleMAO(arv, rehab, false) : 0;

  const acquisition = safeNum(metrics?.acquisition?.total);
  const hardMoney = safeNum(metrics?.hardMoney?.total);
  const rehabTotal = safeNum(metrics?.rehab?.total ?? metrics?.rehabCosts);
  const holding = safeNum(metrics?.holding?.total);
  const selling = safeNum(metrics?.selling?.total);
  const total = acquisition + hardMoney + rehabTotal + holding + selling;

  const costRows = [
    ['Acquisition', acquisition],
    ['Hard Money', hardMoney],
    ['Rehab', rehabTotal],
    ['Holding', holding],
    ['Selling', selling],
  ].filter(([, v]) => v > 0);

  const propRows = [];
  const addProp = (label, val) => {
    const v = safeStr(val);
    if (v !== 'N/A' && v?.trim()) propRows.push([label, v]);
  };
  const beds = deal?.bedrooms ?? propertyIntelligence?.bedrooms ?? '';
  const baths = deal?.bathrooms ?? propertyIntelligence?.bathrooms ?? '';
  addProp('Beds / Baths', [beds, baths].filter(Boolean).join(' / ') || null);
  addProp('Sqft', deal?.sqft ?? propertyIntelligence?.squareFootage ?? propertyIntelligence?.sqft);
  addProp('Year Built', deal?.year_built ?? propertyIntelligence?.yearBuilt);
  addProp('ZIP', deal?.zipCode ?? deal?.zip_code);
  addProp('Property Type', propertyIntelligence?.propertyType);
  addProp('County', propertyIntelligence?.county);
  addProp('School District', propertyIntelligence?.schoolDistrict);
  addProp('Exit Strategy', deal?.exit_strategy);

  const comps = propertyIntelligence?.recentComps ?? [];
  const compRows = (Array.isArray(comps) ? comps : []).slice(0, 12).map((c) => [
    esc(c?.address),
    (c?.price ?? c?.salePrice) != null && Number.isFinite(Number(c?.price ?? c?.salePrice))
      ? formatCurrency(c?.price ?? c?.salePrice)
      : safeStr(c?.salePrice ?? c?.price),
    `${safeStr(c?.beds ?? c?.bedrooms)} / ${safeStr(c?.baths ?? c?.bathrooms)}`,
    safeStr(c?.sqft),
    safeStr(c?.daysOnMarket ?? c?.dom),
  ]);

  let sowHtml = '';
  if (rehabSow) {
    const { lineItems, tiers } = parseSOWLineItems(String(rehabSow));
    const remarks = extractSOWRemarks(String(rehabSow));
    if (lineItems.length) {
      sowHtml += `
        <table class="tbl">
          <thead><tr><th>Item</th><th>Est. Cost</th></tr></thead>
          <tbody>
            ${lineItems.map((r) => `<tr><td>${esc(r.category ? `${r.category}: ${r.item}` : r.item)}</td><td>${formatCurrency(r.cost ?? 0)}</td></tr>`).join('')}
          </tbody>
        </table>`;
      if (tiers?.budget != null || tiers?.midGrade != null || tiers?.highEnd != null) {
        const parts = [];
        if (tiers.budget != null) parts.push(`Budget: ${formatCurrency(tiers.budget)}`);
        if (tiers.midGrade != null) parts.push(`Mid-Grade: ${formatCurrency(tiers.midGrade)}`);
        if (tiers.highEnd != null) parts.push(`High-End: ${formatCurrency(tiers.highEnd)}`);
        sowHtml += `<p class="tier-note">${parts.join(' • ')}</p>`;
      }
    }
    if (remarks?.trim()) {
      sowHtml += `<div class="remarks"><h4>SOW Remarks</h4><p>${esc(remarks.slice(0, 800))}</p></div>`;
    }
  }

  const costBarsHtml =
    total > 0 && costRows.length
      ? costRows
          .map(([label, value]) => {
            const pct = value / total;
            return `<div class="cost-bar"><div class="cost-bar-fill" style="width:${Math.max(2, pct * 100)}%"></div><span class="cost-label">${esc(label)}</span><span class="cost-value">${formatCurrency(value)} (${(pct * 100).toFixed(0)}%)</span></div>`;
          })
          .join('')
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Full Deal Analysis - ${esc(deal?.address || 'Deal')}</title>
  <style>
    :root { --primary: #EA580C; --secondary: #C2410C; --dark: #1e293b; --slate: #334155; --gray: #64748b; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: var(--slate); background: #f8fafc; padding: 24px; max-width: 900px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, var(--dark), #334155); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 1.5em; margin-bottom: 8px; }
    .header .meta { font-size: 0.9em; opacity: 0.9; }
    .header .addr { font-weight: 700; text-align: right; }
    a { color: var(--primary); }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .section h2 { font-size: 1.25em; color: var(--dark); border-bottom: 4px solid var(--primary); padding-bottom: 10px; margin-bottom: 16px; }
    .tbl { width: 100%; border-collapse: collapse; }
    .tbl th { background: var(--primary); color: white; padding: 10px 14px; text-align: left; }
    .tbl td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    .tbl tr:nth-child(even) { background: #f8fafc; }
    .cost-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .cost-bar-fill { background: var(--primary); height: 24px; border-radius: 6px; min-width: 4px; }
    .cost-label { flex: 0 0 120px; font-size: 0.9em; }
    .cost-value { margin-left: auto; font-weight: 600; }
    .tier-note { font-size: 0.9em; color: var(--gray); margin-top: 12px; }
    .remarks { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .remarks h4 { font-size: 1em; margin-bottom: 8px; color: var(--dark); }
    .footer { text-align: center; font-size: 0.8em; color: var(--gray); margin-top: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FULL DEAL ANALYSIS REPORT</h1>
    <div class="meta">Generated: ${new Date().toLocaleDateString()}</div>
    <div class="addr">${esc(deal?.address)}</div>
    ${shareUrl ? `<p style="margin-top:12px;font-size:0.85em;"><a href="${esc(shareUrl)}">${esc(shareUrl)}</a></p>` : ''}
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <table class="tbl">
      <tbody>
        <tr><td>Address</td><td>${esc(deal?.address)}</td></tr>
        <tr><td>Purchase Price</td><td>${formatCurrency(purchase)}</td></tr>
        <tr><td>After Repair Value (ARV)</td><td>${formatCurrency(arv)}</td></tr>
        <tr><td>Rehab Budget</td><td>${formatCurrency(rehab)}</td></tr>
        <tr><td>Max Allowable Offer (MAO)</td><td>${formatCurrency(mao)}</td></tr>
        <tr><td>Deal Score / Risk</td><td>${score}/100 • ${esc(risk)}</td></tr>
        <tr><td>Est. Net Profit</td><td>${formatCurrency(netProfit)}</td></tr>
        <tr><td>Est. ROI</td><td>${roi.toFixed(1)}%</td></tr>
      </tbody>
    </table>
    <h3 style="margin-top:20px;margin-bottom:12px;font-size:1em;">Where the money goes (cost mix)</h3>
    ${costBarsHtml}
  </div>

  ${propRows.length ? `
  <div class="section">
    <h2>Property Details</h2>
    <table class="tbl">
      <tbody>${propRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <h2>Financial Breakdown</h2>
    <table class="tbl">
      <tbody>
        <tr><td>Acquisition</td><td>${formatCurrency(acquisition)}</td></tr>
        <tr><td>Hard Money</td><td>${formatCurrency(hardMoney)}</td></tr>
        <tr><td>Rehab</td><td>${formatCurrency(rehabTotal)}</td></tr>
        <tr><td>Holding</td><td>${formatCurrency(holding)}</td></tr>
        <tr><td>Selling</td><td>${formatCurrency(selling)}</td></tr>
        <tr><td><strong>Total Project Cost</strong></td><td><strong>${formatCurrency(safeNum(metrics?.totalProjectCost ?? metrics?.totalCosts))}</strong></td></tr>
      </tbody>
    </table>
  </div>

  ${compRows.length ? `
  <div class="section">
    <h2>Recent Comps</h2>
    <table class="tbl">
      <thead><tr><th>Address</th><th>Price</th><th>Beds/Baths</th><th>Sqft</th><th>DOM</th></tr></thead>
      <tbody>${compRows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>` : ''}

  ${sowHtml ? `<div class="section"><h2>Rehab Scope of Work</h2>${sowHtml}</div>` : ''}

  ${notes ? `<div class="section"><h2>Notes</h2><p>${esc(String(notes).slice(0, 1200))}</p></div>` : ''}

  <div class="footer">FlipIQ • Full Deal Analysis</div>
</body>
</html>`;
}
