/**
 * Waterford-style loan proposal HTML template.
 * Generates a full HTML document string for preview, PDF export, and download.
 */

const formatCurrency = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
};

const safeNum = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
};

const safeStr = (v) => {
  if (v === null || v === undefined) return 'N/A';
  const s = String(v).trim();
  return s.length ? s : 'N/A';
};

const escapeHtml = (s) => {
  if (s == null || s === '') return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Waterford-style CSS (including @media print and .slide page-break)
const STYLES = `
    @media print {
        body { margin: 0; }
        .slide { page-break-after: always; margin-bottom: 0; }
        .no-break { page-break-inside: avoid; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Arial', sans-serif;
        line-height: 1.6;
        color: #333;
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        min-height: 100vh;
    }
    .slide {
        background: white;
        margin: 20px auto;
        padding: 40px;
        max-width: 900px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        min-height: 600px;
    }
    .slide h1 {
        color: #2c3e50;
        font-size: 2.5em;
        margin-bottom: 20px;
        border-bottom: 4px solid #27ae60;
        padding-bottom: 15px;
        text-align: center;
    }
    .slide h2 {
        color: #16a085;
        font-size: 2em;
        margin-bottom: 25px;
        border-left: 5px solid #16a085;
        padding-left: 20px;
    }
    .slide h3 { color: #c0392b; font-size: 1.5em; margin-bottom: 15px; }
    .highlight-box {
        background: linear-gradient(135deg, #11998e, #16a085);
        color: white;
        padding: 25px;
        border-radius: 10px;
        margin: 20px 0;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .financial-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 25px 0;
    }
    .financial-card {
        background: linear-gradient(135deg, #27ae60, #229954);
        color: white;
        padding: 25px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .financial-card h4 { font-size: 1.1em; margin-bottom: 10px; opacity: 0.9; }
    .financial-card .amount { font-size: 2.2em; font-weight: bold; margin-bottom: 5px; }
    .roi-box {
        background: linear-gradient(135deg, #f39c12, #e67e22);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        margin: 25px 0;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .roi-box .roi-number { font-size: 3.5em; font-weight: bold; margin-bottom: 10px; }
    .timeline {
        display: flex;
        justify-content: space-between;
        margin: 30px 0;
        padding: 20px 0;
    }
    .timeline-item { text-align: center; flex: 1; padding: 0 10px; }
    .timeline-circle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 15px;
        font-weight: bold;
        font-size: 1.2em;
    }
    .comp-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .comp-table th {
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: white;
        padding: 15px;
        text-align: left;
    }
    .comp-table td { padding: 12px 15px; border-bottom: 1px solid #ddd; }
    .comp-table tr:nth-child(even) { background-color: #f8f9fa; }
    .risk-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 25px 0;
    }
    .risk-item {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 20px;
        border-radius: 5px;
    }
    .mitigation {
        background: #d1ecf1;
        border-left: 4px solid #17a2b8;
        padding: 20px;
        border-radius: 5px;
        margin-top: 10px;
    }
    .contact-info {
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        margin-top: 30px;
    }
    .property-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin: 25px 0;
    }
    .stat-box {
        background: linear-gradient(135deg, #9b59b6, #8e44ad);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
    }
    .stat-box .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
    .profit-breakdown {
        background: #f8f9fa;
        padding: 25px;
        border-radius: 10px;
        border: 2px solid #27ae60;
        margin: 20px 0;
    }
    .executive-summary {
        background: linear-gradient(135deg, #11998e, #38ef7d);
        color: white;
        padding: 30px;
        border-radius: 15px;
        margin: 25px 0;
    }
    .location-highlight {
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        padding: 25px;
        border-radius: 15px;
        margin: 20px 0;
        text-align: center;
    }
    .warning-box {
        background: #f8d7da;
        border: 2px solid #c0392b;
        color: #721c24;
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
    }
`;

/**
 * Generate full HTML document for loan proposal (Waterford-style slides).
 * @param {{ deal: object, metrics: object, loanTerms: object, borrowerInfo: object }} options
 * @returns {string} Full HTML document string
 */
export function generateLoanProposalHtml({ deal, metrics, loanTerms, borrowerInfo }) {
  const purchasePrice = safeNum(deal?.purchase_price ?? deal?.purchasePrice);
  const arv = safeNum(deal?.arv);
  const rehabBudget = safeNum(deal?.rehab_costs ?? deal?.rehabCosts);
  const totalCost = safeNum(metrics?.totalProjectCost ?? metrics?.totalCosts);
  const netProfit = safeNum(metrics?.netProfit);
  const roi = safeNum(metrics?.roi);
  const score = safeNum(metrics?.score);
  const risk = safeStr(metrics?.risk);

  const requestedLoanAmount = Math.round(arv * 0.8);
  const loanToArvPct = arv > 0 ? (requestedLoanAmount / arv) * 100 : 0;
  const termMonths = safeNum(loanTerms?.termMonths) || 12;
  const borrowerEquity = Math.max(0, totalCost - requestedLoanAmount);

  const address = safeStr(deal?.address);
  const cityStateZip = safeStr(deal?.zipCode ?? deal?.zip_code ?? deal?.city) || 'N/A';
  const beds = safeStr(deal?.bedrooms);
  const baths = safeStr(deal?.bathrooms);
  const sqft = safeStr(deal?.sqft);
  const exitStrategy = safeStr(deal?.exit_strategy ?? deal?.exitStrategy ?? 'Fix and Flip');
  const thesis = safeStr(deal?.notes || '').slice(0, 600) ||
    `Value-add opportunity at ${address}. Total investment ${formatCurrency(totalCost)} with projected ARV ${formatCurrency(arv)}. Exit: ${exitStrategy}.`;

  const comps = Array.isArray(deal?.comps) && deal.comps.length
    ? deal.comps
    : Array.isArray(deal?.propertyIntelligence?.recentComps)
      ? deal.propertyIntelligence.recentComps
      : [];

  const rehabSow = deal?.rehabSow ?? deal?.rehab_sow ?? deal?.rehabSOW ?? '';
  const rehabSowText = rehabSow ? String(rehabSow).slice(0, 3000) : 'Scope of work to be provided.';

  const sellingCostPct = 10;
  const sellingCost = Math.round(arv * (sellingCostPct / 100));
  const netProceeds = arv - sellingCost;

  const borrowerName = safeStr(borrowerInfo?.name);
  const borrowerExperience = safeStr(borrowerInfo?.experience ?? 'Available upon request');
  const borrowerEmail = safeStr(borrowerInfo?.email ?? '');
  const borrowerPhone = safeStr(borrowerInfo?.phone ?? '');

  const title = `${escapeHtml(address)} - Investment Opportunity`;
  const safeThesis = escapeHtml(thesis);
  const safeRehabSow = escapeHtml(rehabSowText);

  // Slide 1 – Title
  const slide1 = `
    <div class="slide">
        <h1>INVESTMENT OPPORTUNITY</h1>
        <div class="highlight-box">
            <h2 style="color: white; border: none; margin: 0;">${escapeHtml(address)}</h2>
            <h3 style="color: white; margin: 10px 0;">${escapeHtml(cityStateZip)}</h3>
            <p style="font-size: 1.3em; margin: 20px 0;">${escapeHtml(exitStrategy)}</p>
            <p style="font-size: 1.1em;">Deal Score: ${score}/100 · Risk: ${escapeHtml(risk)}</p>
        </div>
        <div class="financial-grid">
            <div class="financial-card">
                <h4>Purchase Price</h4>
                <div class="amount">${formatCurrency(purchasePrice)}</div>
                <p>Acquisition</p>
            </div>
            <div class="financial-card">
                <h4>Target ARV</h4>
                <div class="amount">${formatCurrency(arv)}</div>
                <p>After Repair</p>
            </div>
        </div>
        <div class="roi-box">
            <div class="roi-number">${roi.toFixed(1)}%</div>
            <h3 style="color: white; margin: 0;">Projected ROI</h3>
            <p>${termMonths}-Month Exit Strategy</p>
        </div>
        <div class="location-highlight">
            <h3 style="color: white; margin-bottom: 10px;">Deal Highlights</h3>
            <p>Total Investment: ${formatCurrency(totalCost)}</p>
            <p>Projected Profit: ${formatCurrency(netProfit)}</p>
            <p>Loan Request (80% ARV): ${formatCurrency(requestedLoanAmount)}</p>
        </div>
    </div>`;

  // Slide 2 – Executive Summary
  const slide2 = `
    <div class="slide">
        <h1>Executive Summary</h1>
        <div class="executive-summary">
            <h3 style="color: white; margin-bottom: 20px;">Investment Thesis</h3>
            <p style="font-size: 1.1em; line-height: 1.8;">${safeThesis}</p>
        </div>
        <div class="property-stats">
            <div class="stat-box">
                <div class="stat-number">${beds}</div>
                <p>Bedrooms</p>
            </div>
            <div class="stat-box">
                <div class="stat-number">${baths}</div>
                <p>Bathrooms</p>
            </div>
            <div class="stat-box">
                <div class="stat-number">${sqft}</div>
                <p>Square Feet</p>
            </div>
        </div>
        <div class="financial-grid">
            <div class="financial-card">
                <h4>Total Investment</h4>
                <div class="amount">${formatCurrency(totalCost)}</div>
                <p>Purchase + Rehab</p>
            </div>
            <div class="financial-card">
                <h4>Projected Profit</h4>
                <div class="amount">${formatCurrency(netProfit)}</div>
                <p>After Sale Costs</p>
            </div>
        </div>
        <div style="background: #d4edda; border: 2px solid #27ae60; padding: 25px; border-radius: 10px; margin-top: 25px;">
            <h3 style="color: #155724;">Exit Strategy</h3>
            <p>${escapeHtml(exitStrategy)}</p>
        </div>
    </div>`;

  // Slide 3 – Financial Overview
  const slide3 = `
    <div class="slide">
        <h1>Financial Overview</h1>
        <div class="financial-grid">
            <div class="financial-card">
                <h4>Purchase Price</h4>
                <div class="amount">${formatCurrency(purchasePrice)}</div>
            </div>
            <div class="financial-card">
                <h4>Rehab Budget</h4>
                <div class="amount">${formatCurrency(rehabBudget)}</div>
            </div>
            <div class="financial-card">
                <h4>All-In Cost</h4>
                <div class="amount">${formatCurrency(totalCost)}</div>
            </div>
            <div class="financial-card">
                <h4>Target ARV</h4>
                <div class="amount">${formatCurrency(arv)}</div>
            </div>
        </div>
        <div class="profit-breakdown no-break">
            <h3 style="color: #27ae60;">Profit Analysis - Flip Exit</h3>
            <table style="width: 100%; margin-top: 15px;">
                <tr>
                    <td style="padding: 10px;">After Repair Value (ARV)</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">${formatCurrency(arv)}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                    <td style="padding: 8px;">Less: Selling Costs (${sellingCostPct}%)</td>
                    <td style="padding: 8px; text-align: right;">-${formatCurrency(sellingCost)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px;">Net Proceeds</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(netProceeds)}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                    <td style="padding: 8px;">Less: Total Investment</td>
                    <td style="padding: 8px; text-align: right;">-${formatCurrency(totalCost)}</td>
                </tr>
                <tr style="border-top: 2px solid #27ae60; background: #e8f5e8;">
                    <td style="padding: 10px; font-weight: bold;">Net Profit</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #27ae60;">${formatCurrency(netProfit)}</td>
                </tr>
                <tr style="background: #e8f5e8;">
                    <td style="padding: 10px; font-weight: bold;">ROI</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #27ae60;">${roi.toFixed(1)}%</td>
                </tr>
            </table>
        </div>
    </div>`;

  // Slide 4 – Loan Request
  const slide4 = `
    <div class="slide">
        <h1>Loan Request Details</h1>
        <div class="highlight-box">
            <h2 style="color: white; border: none; margin-bottom: 15px;">Hard Money Loan Terms</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; text-align: left;">
                <div>
                    <p><strong>Loan Amount:</strong> ${formatCurrency(requestedLoanAmount)}</p>
                    <p><strong>LTV Ratio:</strong> 80% (ARV)</p>
                    <p><strong>Loan Term:</strong> ${termMonths} Months</p>
                </div>
                <div>
                    <p><strong>Exit Strategy:</strong> ${termMonths} Months</p>
                    <p><strong>Collateral:</strong> ${formatCurrency(arv)} ARV Property</p>
                    <p><strong>Loan-to-ARV:</strong> ${loanToArvPct.toFixed(1)}%</p>
                </div>
            </div>
        </div>
        <div class="financial-grid">
            <div class="financial-card">
                <h4>Loan Request</h4>
                <div class="amount">${formatCurrency(requestedLoanAmount)}</div>
                <p>80% LTV on ARV</p>
            </div>
            <div class="financial-card">
                <h4>Borrower Equity</h4>
                <div class="amount">${formatCurrency(borrowerEquity)}</div>
                <p>Down Payment</p>
            </div>
        </div>
        <div class="timeline">
            <div class="timeline-item">
                <div class="timeline-circle">1</div>
                <h4>Close</h4>
                <p>Fund Loan</p>
            </div>
            <div class="timeline-item">
                <div class="timeline-circle">2</div>
                <h4>Renovate</h4>
                <p>Rehab</p>
            </div>
            <div class="timeline-item">
                <div class="timeline-circle">3</div>
                <h4>Market</h4>
                <p>List &amp; Show</p>
            </div>
            <div class="timeline-item">
                <div class="timeline-circle">4</div>
                <h4>Exit</h4>
                <p>Sale Period</p>
            </div>
        </div>
        <div style="background: #d4edda; border: 2px solid #27ae60; padding: 20px; border-radius: 10px; margin-top: 25px;">
            <h3 style="color: #155724;">Loan Security</h3>
            <p><strong>Loan-to-ARV:</strong> ${loanToArvPct.toFixed(1)}% – Equity cushion</p>
            <p><strong>Deal Score:</strong> ${score}/100 · Risk: ${escapeHtml(risk)}</p>
        </div>
    </div>`;

  // Slide 5 – Comparables
  const compRows = comps.length
    ? comps.slice(0, 8).map((c) => {
        const addr = safeStr(c?.address ?? c?.street);
        const price = c?.price ?? c?.salePrice ?? c?.soldPrice ?? c?.sold_price;
        const priceStr = typeof price === 'number' ? formatCurrency(price) : safeStr(price);
        const bedsBaths = `${safeStr(c?.bedrooms)}/${safeStr(c?.bathrooms)}`;
        const sf = safeStr(c?.sqft ?? c?.square_feet);
        const built = safeStr(c?.yearBuilt ?? c?.year_built);
        const saleDate = safeStr(c?.saleDate ?? c?.sale_date ?? c?.soldDate);
        const psf = c?.price_per_sqft ?? (typeof price === 'number' && Number(c?.sqft) ? Math.round(price / Number(c.sqft)) : '');
        return `<tr>
            <td>${escapeHtml(addr)}</td>
            <td><strong>${escapeHtml(priceStr)}</strong></td>
            <td>${escapeHtml(bedsBaths)}</td>
            <td>${escapeHtml(sf)}</td>
            <td>${escapeHtml(built)}</td>
            <td>${escapeHtml(saleDate)}</td>
            <td>${escapeHtml(String(psf))}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="7">No comparables data available.</td></tr>';

  const slide5 = `
    <div class="slide">
        <h1>Market Comparables</h1>
        <h2>Subject: ${escapeHtml(address)}</h2>
        <div style="background: #e3f2fd; border: 2px solid #2196f3; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #1565c0;">Subject Property (Post-Renovation)</h3>
            <p><strong>${escapeHtml(address)}:</strong> ${beds} Bed / ${baths} Bath, ${sqft} SF</p>
            <p><strong>Target ARV:</strong> ${formatCurrency(arv)}</p>
        </div>
        <table class="comp-table">
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Sold Price</th>
                    <th>Beds/Baths</th>
                    <th>Sq Ft</th>
                    <th>Built</th>
                    <th>Sale Date</th>
                    <th>$/SF</th>
                </tr>
            </thead>
            <tbody>${compRows}</tbody>
        </table>
    </div>`;

  // Slide 6 – Scope of Work
  const slide6 = `
    <div class="slide">
        <h1>Renovation Scope</h1>
        <h2>Scope of Work</h2>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 4px solid #27ae60; margin: 20px 0;">
            <div style="white-space: pre-wrap; line-height: 1.7;">${safeRehabSow}</div>
        </div>
        <p style="margin-top: 15px;"><strong>Total Rehab Budget:</strong> ${formatCurrency(rehabBudget)}</p>
    </div>`;

  // Slide 7 – Risk (optional; include if we have risk text)
  const slide7 = (risk && risk !== 'N/A')
    ? `
    <div class="slide">
        <h1>Risk Assessment</h1>
        <div class="risk-grid">
            <div class="risk-item">
                <h3 style="color: #856404;">Deal Risk</h3>
                <p><strong>Risk:</strong> ${escapeHtml(risk)}</p>
                <div class="mitigation">
                    <p><strong>Mitigation:</strong> Loan-to-ARV ${loanToArvPct.toFixed(1)}% provides equity cushion. Exit strategy: ${escapeHtml(exitStrategy)}.</p>
                </div>
            </div>
        </div>
        <div class="highlight-box">
            <h3 style="color: white;">Deal Score: ${score}/100</h3>
        </div>
    </div>`
    : '';

  // Slide 8 – Team / Contact
  const slide8 = `
    <div class="slide">
        <h1>Investment Team</h1>
        <div style="background: linear-gradient(135deg, #2c3e50, #34495e); color: white; padding: 30px; border-radius: 15px; margin: 25px 0;">
            <h2 style="color: white; border: none; margin-bottom: 20px; text-align: center;">Borrower</h2>
            <div style="text-align: center; margin-bottom: 25px;">
                <h3 style="color: #1abc9c;">${escapeHtml(borrowerName)}</h3>
                <p style="font-size: 1.1em; opacity: 0.9;">${escapeHtml(borrowerExperience)}</p>
            </div>
        </div>
        <div class="contact-info">
            <h3 style="color: white; margin-bottom: 20px;">Contact Information</h3>
            <p>${escapeHtml(borrowerName)}</p>
            ${borrowerEmail !== 'N/A' ? `<p>Email: ${escapeHtml(borrowerEmail)}</p>` : ''}
            ${borrowerPhone !== 'N/A' ? `<p>Phone: ${escapeHtml(borrowerPhone)}</p>` : ''}
        </div>
    </div>`;

  // Slide 9 – Summary / Next Steps
  const slide9 = `
    <div class="slide">
        <h1>Summary &amp; Next Steps</h1>
        <div class="executive-summary">
            <h2 style="color: white; border: none; margin-bottom: 20px; text-align: center;">Deal Highlights</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; text-align: left;">
                <div>
                    <h3 style="color: #ecf0f1;">Financial</h3>
                    <ul style="line-height: 1.8;">
                        <li>Purchase: ${formatCurrency(purchasePrice)}</li>
                        <li>Rehab: ${formatCurrency(rehabBudget)}</li>
                        <li>Target ARV: ${formatCurrency(arv)}</li>
                        <li>Projected Profit: ${formatCurrency(netProfit)} (${roi.toFixed(1)}% ROI)</li>
                    </ul>
                </div>
                <div>
                    <h3 style="color: #ecf0f1;">Loan Ask</h3>
                    <ul style="line-height: 1.8;">
                        <li>Loan Request: ${formatCurrency(requestedLoanAmount)} (80% ARV)</li>
                        <li>Term: ${termMonths} months</li>
                        <li>Loan-to-ARV: ${loanToArvPct.toFixed(1)}%</li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="timeline">
            <div class="timeline-item">
                <div class="timeline-circle">1</div>
                <h4>Review</h4>
                <p>Loan application</p>
            </div>
            <div class="timeline-item">
                <div class="timeline-circle">2</div>
                <h4>Inspection</h4>
                <p>Property assessment</p>
            </div>
            <div class="timeline-item">
                <div class="timeline-circle">3</div>
                <h4>Close</h4>
                <p>Funding</p>
            </div>
            <div class="timeline-item">
                <div class="timeline-circle">4</div>
                <h4>Execute</h4>
                <p>Begin renovation</p>
            </div>
        </div>
        <div class="contact-info">
            <h3 style="color: white;">Ready to proceed</h3>
            <p>${escapeHtml(borrowerName)}</p>
        </div>
    </div>`;

  const slides = [slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8, slide9].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${STYLES}</style>
</head>
<body>
${slides}
</body>
</html>`;
}

export { formatCurrency as formatCurrencyForProposal };
