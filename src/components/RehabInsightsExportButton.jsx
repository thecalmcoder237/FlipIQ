import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { extractSOWTotalCost, extractSOWTimeline } from '@/utils/sowParser';

const escapeHtml = (s) => {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const RehabInsightsExportButton = ({ deal, metrics, propertyIntelligence, sowData, photos }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const currentBudget = Number(deal?.rehab_costs ?? deal?.rehabCosts ?? 0) || 0;
  const sowEstimate = sowData ? extractSOWTotalCost(sowData) : null;
  const sowTimeline = sowData ? extractSOWTimeline(sowData) : null;
  const hasSowTotal = sowEstimate != null && sowEstimate > 0;

  const buildHtmlReport = () => {
    const title = 'Rehab Insights & Deal Analysis Report';
    const date = new Date().toLocaleDateString();
    const address = escapeHtml(deal?.address ?? '');
    const purchasePrice = deal?.purchase_price ?? deal?.purchasePrice ?? 0;
    const arv = deal?.arv ?? 0;
    const score = metrics?.score ?? 0;
    const netProfit = metrics?.netProfit ?? 0;
    const roi = metrics?.roi ?? 0;

    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.5;}
h1{font-size:1.5rem;margin-bottom:0.5rem;}
h2{font-size:1.2rem;margin-top:1.5rem;margin-bottom:0.5rem;border-bottom:1px solid #ddd;}
.muted{color:#666;font-size:0.9rem;}
table{width:100%;border-collapse:collapse;margin:0.5rem 0;}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee;}
th{background:#f5f5f5;font-weight:600;}
tr:nth-child(even){background:#fafafa;}
.sow-pre{white-space:pre-wrap;font-size:0.9rem;background:#f9f9f9;padding:12px;border-radius:6px;overflow-x:auto;}
.photo-item{margin:8px 0;padding:8px;background:#f5f5f5;border-radius:4px;}
</style></head><body>`;

    html += `<h1>${escapeHtml(title)}</h1>`;
    html += `<p class="muted">Generated on ${escapeHtml(date)}</p>`;
    html += `<p class="muted">Property: ${address}</p>`;

    html += `<h2>Deal Executive Summary</h2><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
    html += `<tr><td>Address</td><td>${address}</td></tr>`;
    html += `<tr><td>Purchase Price</td><td>$${Number(purchasePrice).toLocaleString()}</td></tr>`;
    html += `<tr><td>ARV</td><td>$${Number(arv).toLocaleString()}</td></tr>`;
    html += `<tr><td>Current Rehab Budget</td><td>$${currentBudget.toLocaleString()}</td></tr>`;
    html += `<tr><td>Deal Score</td><td>${score}/100</td></tr>`;
    html += `<tr><td>Est. Net Profit</td><td>$${Number(netProfit).toLocaleString()}</td></tr>`;
    html += `<tr><td>Est. ROI</td><td>${Number(roi).toFixed(1)}%</td></tr>`;
    html += `</tbody></table>`;

    if (propertyIntelligence && typeof propertyIntelligence === 'object') {
      html += `<h2>Property Specifications</h2><table><thead><tr><th>Specification</th><th>Value</th></tr></thead><tbody>`;
      Object.entries(propertyIntelligence).forEach(([key, val]) => {
        if (key !== 'recentComps' && typeof val !== 'object' && val != null) {
          html += `<tr><td>${escapeHtml(key.replace(/([A-Z])/g, ' $1').trim())}</td><td>${escapeHtml(String(val))}</td></tr>`;
        }
      });
      html += `</tbody></table>`;
    }

    if (photos && photos.length > 0) {
      html += `<h2>Site Photos</h2><p class="muted">Total Photos: ${photos.length}</p>`;
      photos.forEach((photo, idx) => {
        const cond = photo?.analysis?.condition ?? 'Analyzed';
        const obs = photo?.analysis?.observations ? String(photo.analysis.observations).slice(0, 120) + '...' : '';
        html += `<div class="photo-item"><strong>Photo ${idx + 1}:</strong> ${escapeHtml(cond)}${obs ? '<br/>' + escapeHtml(obs) : ''}</div>`;
      });
    }

    if (sowData) {
      html += `<h2>Generated Scope of Work</h2>`;
      if (hasSowTotal) html += `<p><strong>SOW Estimated Cost:</strong> $${sowEstimate.toLocaleString()}</p>`;
      if (sowTimeline) {
        const label = typeof sowTimeline === 'object' && sowTimeline.value != null
          ? `${sowTimeline.value} ${sowTimeline.unit || 'weeks'}`
          : `${sowTimeline} weeks`;
        html += `<p><strong>Estimated Timeline:</strong> ${escapeHtml(label)}</p>`;
      }
      html += `<pre class="sow-pre">${escapeHtml(sowData)}</pre>`;
    }

    if (sowData && hasSowTotal) {
      html += `<h2>Budget Comparison</h2><table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>`;
      html += `<tr><td>Your Rehab Budget</td><td>$${currentBudget.toLocaleString()}</td></tr>`;
      html += `<tr><td>SOW Visual Analysis Estimate</td><td>$${sowEstimate.toLocaleString()}</td></tr>`;
      const diff = sowEstimate - currentBudget;
      const pct = currentBudget > 0 ? ((diff / currentBudget) * 100).toFixed(1) : '0';
      html += `<tr><td>Variance</td><td>$${Math.abs(diff).toLocaleString()} (${diff > 0 ? '+' : ''}${pct}%)</td></tr>`;
      html += `</tbody></table>`;
    }

    if (metrics) {
      html += `<h2>Financial Breakdown</h2><table><tbody>`;
      const acq = metrics.acquisition?.total ?? 0;
      const hm = metrics.hardMoney?.total ?? 0;
      const rehab = metrics.rehab?.total ?? 0;
      const hold = metrics.holding?.total ?? 0;
      const sell = metrics.selling?.total ?? 0;
      const total = metrics.totalProjectCost ?? 0;
      html += `<tr><td>Acquisition Costs</td><td>$${Number(acq).toLocaleString()}</td></tr>`;
      html += `<tr><td>Hard Money Costs</td><td>$${Number(hm).toLocaleString()}</td></tr>`;
      html += `<tr><td>Rehab Costs</td><td>$${Number(rehab).toLocaleString()}</td></tr>`;
      html += `<tr><td>Holding Costs</td><td>$${Number(hold).toLocaleString()}</td></tr>`;
      html += `<tr><td>Selling Costs</td><td>$${Number(sell).toLocaleString()}</td></tr>`;
      html += `<tr><td><strong>TOTAL PROJECT COST</strong></td><td><strong>$${Number(total).toLocaleString()}</strong></td></tr>`;
      html += `</tbody></table>`;
    }

    html += `</body></html>`;
    return html;
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const html = buildHtmlReport();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rehab-Insights-${(deal?.address ?? 'report').replace(/\s+/g, '-').substring(0, 30)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Report Downloaded', description: 'Your Rehab Insights report (HTML) is ready.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Export Failed', description: error?.message || 'Could not generate report.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
      <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'Generating...' : 'Export Rehab Insights'}
    </Button>
  );
};

export default RehabInsightsExportButton;
