/**
 * Print report utilities - generates styled HTML reports and opens print window.
 * Used for Intelligence, Rehab Insights, and Comps tab print exports.
 */

import { escapeHtml, wrapReport } from '@/utils/reportHtmlTemplate';
import { extractSOWTotalCost, extractSOWTimeline } from '@/utils/sowParser';

/**
 * Opens a new window with the given HTML and triggers print dialog.
 */
export function openPrintWindow(html, title = 'Report') {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  w.focus();
  return true;
}

/**
 * Builds full HTML for Rehab Insights report. Used by both Export (download) and Print.
 */
export function buildRehabInsightsHtml(
  { deal, metrics, propertyIntelligence, sowData, photos },
  opts = {}
) {
  const currentBudget = Number(deal?.rehab_costs ?? deal?.rehabCosts ?? 0) || 0;
  const sowEstimate = sowData ? extractSOWTotalCost(sowData) : null;
  const sowTimeline = sowData ? extractSOWTimeline(sowData) : null;
  const hasSowTotal = sowEstimate != null && sowEstimate > 0;

  const address = escapeHtml(deal?.address ?? '');
  const purchasePrice = deal?.purchase_price ?? deal?.purchasePrice ?? 0;
  const arv = deal?.arv ?? 0;
  const score = metrics?.score ?? 0;
  const netProfit = metrics?.netProfit ?? 0;
  const roi = metrics?.roi ?? 0;

  let content = '';

  content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Deal Executive Summary</h2>`;
  content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
  content += `<tr><td>Address</td><td>${address}</td></tr>`;
  content += `<tr><td>Purchase Price</td><td>$${Number(purchasePrice).toLocaleString()}</td></tr>`;
  content += `<tr><td>ARV</td><td>$${Number(arv).toLocaleString()}</td></tr>`;
  content += `<tr><td>Current Rehab Budget</td><td>$${currentBudget.toLocaleString()}</td></tr>`;
  content += `<tr><td>Deal Score</td><td>${score}/100</td></tr>`;
  content += `<tr><td>Est. Net Profit</td><td>$${Number(netProfit).toLocaleString()}</td></tr>`;
  content += `<tr><td>Est. ROI</td><td>${Number(roi).toFixed(1)}%</td></tr>`;
  content += `</tbody></table></div></section>`;

  if (propertyIntelligence && typeof propertyIntelligence === 'object') {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Property Specifications</h2>`;
    content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Specification</th><th>Value</th></tr></thead><tbody>`;
    Object.entries(propertyIntelligence).forEach(([key, val]) => {
      if (key !== 'recentComps' && typeof val !== 'object' && val != null) {
        content += `<tr><td>${escapeHtml(key.replace(/([A-Z])/g, ' $1').trim())}</td><td>${escapeHtml(String(val))}</td></tr>`;
      }
    });
    content += `</tbody></table></div></section>`;
  }

  if (photos && photos.length > 0) {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Site Photos</h2><p class="text-muted">Total Photos: ${photos.length}</p>`;
    photos.forEach((photo, idx) => {
      const cond = photo?.analysis?.condition ?? 'Analyzed';
      const obs = photo?.analysis?.observations ? String(photo.analysis.observations).slice(0, 120) + '...' : '';
      content += `<div class="card mb-2"><div class="card-body py-2"><strong>Photo ${idx + 1}:</strong> ${escapeHtml(cond)}${obs ? '<br/><small class="text-muted">' + escapeHtml(obs) + '</small>' : ''}</div></div>`;
    });
    content += `</section>`;
  }

  if (sowData) {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Generated Scope of Work</h2>`;
    if (hasSowTotal) content += `<p><strong>SOW Estimated Cost:</strong> $${sowEstimate.toLocaleString()}</p>`;
    if (sowTimeline) {
      const label = typeof sowTimeline === 'object' && sowTimeline.value != null
        ? `${sowTimeline.value} ${sowTimeline.unit || 'weeks'}`
        : `${sowTimeline} weeks`;
      content += `<p><strong>Estimated Timeline:</strong> ${escapeHtml(label)}</p>`;
    }
    content += `<pre class="bg-light p-3 rounded border overflow-auto" style="white-space:pre-wrap;">${escapeHtml(sowData)}</pre></section>`;
  }

  if (sowData && hasSowTotal) {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Budget Comparison</h2>`;
    content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Item</th><th>Amount</th></tr></thead><tbody>`;
    content += `<tr><td>Your Rehab Budget</td><td>$${currentBudget.toLocaleString()}</td></tr>`;
    content += `<tr><td>SOW Visual Analysis Estimate</td><td>$${sowEstimate.toLocaleString()}</td></tr>`;
    const diff = sowEstimate - currentBudget;
    const pct = currentBudget > 0 ? ((diff / currentBudget) * 100).toFixed(1) : '0';
    content += `<tr><td>Variance</td><td>$${Math.abs(diff).toLocaleString()} (${diff > 0 ? '+' : ''}${pct}%)</td></tr>`;
    content += `</tbody></table></div></section>`;
  }

  if (metrics) {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Financial Breakdown</h2>`;
    content += `<div class="table-responsive"><table class="table table-bordered"><tbody>`;
    const acq = metrics.acquisition?.total ?? 0;
    const hm = metrics.hardMoney?.total ?? 0;
    const rehab = metrics.rehab?.total ?? 0;
    const hold = metrics.holding?.total ?? 0;
    const sell = metrics.selling?.total ?? 0;
    const total = metrics.totalProjectCost ?? 0;
    content += `<tr><td>Acquisition Costs</td><td>$${Number(acq).toLocaleString()}</td></tr>`;
    content += `<tr><td>Hard Money Costs</td><td>$${Number(hm).toLocaleString()}</td></tr>`;
    content += `<tr><td>Rehab Costs</td><td>$${Number(rehab).toLocaleString()}</td></tr>`;
    content += `<tr><td>Holding Costs</td><td>$${Number(hold).toLocaleString()}</td></tr>`;
    content += `<tr><td>Selling Costs</td><td>$${Number(sell).toLocaleString()}</td></tr>`;
    content += `<tr class="table-dark"><td><strong>TOTAL PROJECT COST</strong></td><td><strong>$${Number(total).toLocaleString()}</strong></td></tr>`;
    content += `</tbody></table></div></section>`;
  }

  return wrapReport(content, {
    title: 'Rehab Insights & Deal Analysis Report',
    subtitle: address,
    autoPrint: opts.autoPrint || false,
  });
}

/**
 * Prints the Rehab Insights report.
 */
export function printRehabInsightsReport({ deal, metrics, propertyIntelligence, sowData, photos }) {
  const html = buildRehabInsightsHtml(
    { deal, metrics, propertyIntelligence, sowData, photos },
    { autoPrint: true }
  );
  return openPrintWindow(html, 'Rehab Insights Report');
}

/**
 * Builds full HTML for Intelligence tab report.
 */
export function printIntelligenceReport({
  deal,
  metrics,
  propertyIntelligence,
  scenarioMode,
  activeScenarioMetrics,
}) {
  const address = escapeHtml(deal?.address ?? '');
  const purchasePrice = deal?.purchasePrice ?? deal?.purchase_price ?? 0;
  const arv = metrics?.arv ?? deal?.arv ?? 0;
  const rehabCosts = metrics?.rehab?.total ?? deal?.rehab_costs ?? deal?.rehabCosts ?? 0;
  const score = metrics?.score ?? 0;
  const netProfit = metrics?.netProfit ?? 0;
  const roi = metrics?.roi ?? 0;
  const risk = metrics?.risk ?? 'N/A';

  const acq = metrics?.acquisition?.total ?? 0;
  const hm = metrics?.hardMoney?.total ?? 0;
  const rehab = metrics?.rehab?.total ?? 0;
  const hold = metrics?.holding?.total ?? 0;
  const sell = metrics?.selling?.total ?? 0;
  const total = metrics?.totalProjectCost ?? 0;

  let content = '';

  content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Deal Executive Summary</h2>`;
  content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
  content += `<tr><td>Address</td><td>${address}</td></tr>`;
  content += `<tr><td>Purchase Price</td><td>$${Number(purchasePrice).toLocaleString()}</td></tr>`;
  content += `<tr><td>ARV</td><td>$${Number(arv).toLocaleString()}</td></tr>`;
  content += `<tr><td>Rehab Budget</td><td>$${Number(rehabCosts).toLocaleString()}</td></tr>`;
  content += `<tr><td>Deal Score</td><td>${score}/100</td></tr>`;
  content += `<tr><td>Risk</td><td>${escapeHtml(risk)}</td></tr>`;
  content += `<tr><td>Est. Net Profit</td><td>$${Number(netProfit).toLocaleString()}</td></tr>`;
  content += `<tr><td>Est. ROI</td><td>${Number(roi).toFixed(1)}%</td></tr>`;
  content += `</tbody></table></div></section>`;

  content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Financial Breakdown</h2>`;
  content += `<div class="table-responsive"><table class="table table-bordered"><tbody>`;
  content += `<tr><td>Acquisition Costs</td><td>$${Number(acq).toLocaleString()}</td></tr>`;
  content += `<tr><td>Hard Money Costs</td><td>$${Number(hm).toLocaleString()}</td></tr>`;
  content += `<tr><td>Rehab Costs</td><td>$${Number(rehab).toLocaleString()}</td></tr>`;
  content += `<tr><td>Holding Costs</td><td>$${Number(hold).toLocaleString()}</td></tr>`;
  content += `<tr><td>Selling Costs</td><td>$${Number(sell).toLocaleString()}</td></tr>`;
  content += `<tr class="table-dark"><td><strong>TOTAL PROJECT COST</strong></td><td><strong>$${Number(total).toLocaleString()}</strong></td></tr>`;
  content += `</tbody></table></div></section>`;

  if (propertyIntelligence && typeof propertyIntelligence === 'object') {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Property Intelligence</h2>`;
    content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Specification</th><th>Value</th></tr></thead><tbody>`;
    const flat = propertyIntelligence?.propertySpecs && typeof propertyIntelligence.propertySpecs === 'object'
      ? { ...propertyIntelligence, ...propertyIntelligence.propertySpecs }
      : propertyIntelligence;
    Object.entries(flat).forEach(([key, val]) => {
      if (key !== 'recentComps' && typeof val !== 'object' && val != null) {
        content += `<tr><td>${escapeHtml(key.replace(/([A-Z])/g, ' $1').trim())}</td><td>${escapeHtml(String(val))}</td></tr>`;
      }
    });
    content += `</tbody></table></div></section>`;
  }

  if (activeScenarioMetrics) {
    const scenarioName = scenarioMode === 'worst' ? 'Stress Test' : scenarioMode === 'base' ? 'Base Case' : scenarioMode === 'best' ? 'Best Case' : scenarioMode;
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Scenario: ${escapeHtml(scenarioName)}</h2>`;
    content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
    content += `<tr><td>Net Profit</td><td>$${Number(activeScenarioMetrics.netProfit ?? 0).toLocaleString()}</td></tr>`;
    content += `<tr><td>ROI</td><td>${Number(activeScenarioMetrics.roi ?? 0).toFixed(1)}%</td></tr>`;
    content += `</tbody></table></div></section>`;
  }

  const html = wrapReport(content, {
    title: 'Intelligence Report',
    subtitle: address,
    autoPrint: true,
  });
  return openPrintWindow(html, 'Intelligence Report');
}

/**
 * Builds full HTML for Comps tab report and opens print window.
 */
export function printCompsReport({ comps, subjectAddress, subjectSpecs, avmValue }) {
  const address = escapeHtml(subjectAddress || subjectSpecs?.address || '—');

  let content = '';

  content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Subject Property</h2>`;
  content += `<p class="mb-2"><strong>Address:</strong> ${address}</p>`;
  if (subjectSpecs) {
    content += `<p class="mb-0 text-muted">${subjectSpecs.squareFootage ?? subjectSpecs.sqft ?? '—'} sqft &bull; ${subjectSpecs.bedrooms ?? '—'} beds &bull; ${subjectSpecs.bathrooms ?? '—'} baths</p>`;
  }
  if (avmValue != null) {
    content += `<p class="mb-0"><strong>AVM Value:</strong> $${Number(avmValue).toLocaleString()}</p>`;
  }
  content += `</section>`;

  if (comps && comps.length > 0) {
    content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Comparable Sales</h2>`;
    content += `<div class="table-responsive"><table class="table table-bordered table-striped"><thead class="table-light"><tr><th>Address</th><th>Price</th><th>Beds/Baths</th><th>Sqft</th><th>DOM</th></tr></thead><tbody>`;
    comps.forEach((c) => {
      const price = c.salePrice ?? c.price ?? '—';
      const priceStr = typeof price === 'number' ? `$${price.toLocaleString()}` : escapeHtml(String(price));
      content += `<tr><td>${escapeHtml(c.address ?? '—')}</td><td>${priceStr}</td><td>${c.beds ?? c.bedrooms ?? '—'} / ${c.baths ?? c.bathrooms ?? '—'}</td><td>${c.sqft ?? '—'}</td><td>${c.dom ?? c.daysOnMarket ?? '—'}</td></tr>`;
    });
    content += `</tbody></table></div></section>`;

    if (subjectAddress || subjectSpecs || avmValue != null) {
      content += `<section class="mb-4"><h2 class="h5 fw-bold text-dark border-bottom pb-2 mb-3">Subject vs Comps</h2>`;
      content += `<div class="table-responsive"><table class="table table-bordered"><thead class="table-light"><tr><th>Attribute</th><th>Subject</th>`;
      comps.forEach((_, i) => { content += `<th>Comp ${i + 1}</th>`; });
      content += `</tr></thead><tbody>`;

      const rows = [
        ['Address', subjectAddress || subjectSpecs?.address || '—', (c) => c.address],
        ['Sqft', subjectSpecs?.squareFootage ?? subjectSpecs?.sqft ?? '—', (c) => c.sqft],
        ['Year built', subjectSpecs?.yearBuilt ?? '—', (c) => c.yearBuilt],
        ['Beds', subjectSpecs?.bedrooms ?? '—', (c) => c.beds ?? c.bedrooms],
        ['Baths', subjectSpecs?.bathrooms ?? '—', (c) => c.baths ?? c.bathrooms],
        ['Price', avmValue != null ? `$${Number(avmValue).toLocaleString()}` : '—', (c) => (c.salePrice ?? c.price) != null ? `$${Number(c.salePrice ?? c.price).toLocaleString()}` : '—'],
        ['$/sqft', avmValue != null && (subjectSpecs?.squareFootage ?? subjectSpecs?.sqft) ? `$${Math.round(avmValue / (Number(subjectSpecs?.squareFootage ?? subjectSpecs?.sqft) || 1))}` : '—', (c) => (c.salePrice ?? c.price) != null && c.sqft ? `$${Math.round((Number(c.salePrice ?? c.price) || 0) / (Number(c.sqft) || 1))}` : '—'],
      ];
      rows.forEach(([attr, subjVal, getComp]) => {
        content += `<tr><td class="fw-medium">${escapeHtml(attr)}</td><td>${escapeHtml(String(subjVal ?? '—'))}</td>`;
        comps.forEach((c) => { content += `<td>${escapeHtml(String(getComp(c) ?? '—'))}</td>`; });
        content += `</tr>`;
      });
      content += `</tbody></table></div></section>`;
    }
  }

  const html = wrapReport(content, {
    title: 'Comps Report',
    subtitle: address,
    autoPrint: true,
  });
  return openPrintWindow(html, 'Comps Report');
}
