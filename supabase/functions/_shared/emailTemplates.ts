type Kpi = { label: string; value: string };

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  return `${n.toFixed(1)}%`;
}

function kpiGrid(kpis: Kpi[]): string {
  const items = kpis
    .map(
      (k) => `
      <td style="padding:10px 10px 0 0; vertical-align:top;">
        <div style="border:1px solid #E5E7EB; border-radius:12px; padding:12px 14px; background:#FFFFFF;">
          <div style="font-size:12px; color:#6B7280; margin-bottom:6px;">${esc(k.label)}</div>
          <div style="font-size:16px; font-weight:700; color:#111827;">${esc(k.value)}</div>
        </div>
      </td>`
    )
    .join("");

  // 2-column grid
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(`<tr>${items[i] ?? ""}${items[i + 1] ?? ""}</tr>`);
  }
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows.join("")}</table>`;
}

function bulletList(items: string[]): string {
  const li = items
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => `<li style="margin:0 0 8px 0; color:#111827;">${esc(t)}</li>`)
    .join("");
  return `<ul style="margin:0; padding:0 0 0 18px;">${li}</ul>`;
}

function layout({
  title,
  subtitle,
  headerRight,
  bodyHtml,
  ctaUrl,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  headerRight?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta =
    ctaUrl && ctaLabel
      ? `
      <div style="margin-top:18px;">
        <a href="${esc(ctaUrl)}" style="display:inline-block; background:#1D4ED8; color:#FFFFFF; text-decoration:none; padding:12px 16px; border-radius:10px; font-weight:700;">
          ${esc(ctaLabel)}
        </a>
      </div>`
      : "";

  return `
  <div style="background:#F3F4F6; padding:24px 12px; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; max-width:680px; margin:0 auto;">
      <tr>
        <td style="padding:0 0 12px 0;">
          <div style="background:#0F172A; border-radius:16px; padding:18px 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td style="vertical-align:top;">
                  <div style="color:#FBBF24; font-weight:800; letter-spacing:0.5px; font-size:12px;">FLIPIQ</div>
                  <div style="color:#FFFFFF; font-size:20px; font-weight:800; margin-top:6px;">${esc(title)}</div>
                  <div style="color:#CBD5E1; font-size:13px; margin-top:6px;">${esc(subtitle)}</div>
                </td>
                <td style="text-align:right; vertical-align:top; color:#CBD5E1; font-size:12px;">
                  ${headerRight ? esc(headerRight) : esc(new Date().toLocaleDateString())}
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div style="background:#FFFFFF; border-radius:16px; padding:18px; border:1px solid #E5E7EB;">
            ${bodyHtml}
            ${cta}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 6px 0 6px; color:#6B7280; font-size:12px; text-align:center;">
          FlipIQ • Real Estate Deal Analysis
        </td>
      </tr>
    </table>
  </div>`;
}

export function dealSummaryEmailHtml(params: {
  dealAddress: string;
  purchasePrice?: number;
  arv?: number;
  rehabCosts?: number;
  netProfit?: number;
  roi?: number;
  score?: number;
  risk?: string;
  downloadUrl?: string;
}): string {
  const {
    dealAddress,
    purchasePrice,
    arv,
    rehabCosts,
    netProfit,
    roi,
    score,
    risk,
    downloadUrl,
  } = params;

  const kpis: Kpi[] = [
    { label: "Purchase", value: money(purchasePrice) },
    { label: "ARV", value: money(arv) },
    { label: "Rehab", value: money(rehabCosts) },
    { label: "Net Profit", value: money(netProfit) },
    { label: "ROI", value: pct(roi) },
    { label: "Score / Risk", value: `${Number(score ?? 0)}/100 • ${esc(risk ?? "N/A")}` },
  ];

  const body = `
    <div style="font-size:14px; color:#111827; font-weight:700; margin-bottom:10px;">Deal Snapshot</div>
    ${kpiGrid(kpis)}
    <div style="margin-top:16px; font-size:14px; color:#111827; font-weight:700;">Summary</div>
    <div style="margin-top:8px; font-size:13px; color:#374151; line-height:1.5;">
      Full Analysis PDF is ready for review. Use the button below to download the report or view it in your browser.
    </div>
  `;

  return layout({
    title: "Deal Summary Report",
    subtitle: dealAddress,
    bodyHtml: body,
    ctaUrl: downloadUrl,
    ctaLabel: downloadUrl ? "Download Full Analysis (PDF)" : undefined,
  });
}

export function loanProposalEmailHtml(params: {
  dealAddress: string;
  arv?: number;
  requestedLoanAmount?: number;
  ltvArv?: number;
  netProfit?: number;
  roi?: number;
  score?: number;
  downloadUrl?: string;
}): string {
  const { dealAddress, arv, requestedLoanAmount, ltvArv, netProfit, roi, score, downloadUrl } = params;

  const kpis: Kpi[] = [
    { label: "ARV", value: money(arv) },
    { label: "Requested Loan", value: money(requestedLoanAmount) },
    { label: "LTV (ARV)", value: `${Number.isFinite(ltvArv as number) ? (ltvArv as number).toFixed(1) : "80.0"}%` },
    { label: "Est. Net Profit", value: money(netProfit) },
    { label: "Est. ROI", value: pct(roi) },
    { label: "Deal Score", value: `${Number(score ?? 0)}/100` },
  ];

  const body = `
    <div style="font-size:14px; color:#111827; font-weight:700; margin-bottom:10px;">Loan Proposal Snapshot</div>
    ${kpiGrid(kpis)}
    <div style="margin-top:16px; font-size:14px; color:#111827; font-weight:700;">Lender Request</div>
    <div style="margin-top:8px; font-size:13px; color:#374151; line-height:1.5;">
      Attached is a lender-ready loan proposal PDF. The request targets <b>80% ARV LTV</b> and includes a full presentation of the deal, supporting comps/market context (when available), and rehab summary.
    </div>
  `;

  return layout({
    title: "Investment Loan Proposal",
    subtitle: dealAddress,
    bodyHtml: body,
    ctaUrl: downloadUrl,
    ctaLabel: downloadUrl ? "Download Loan Proposal (PDF)" : undefined,
  });
}

export function dealPackageEmailHtml(params: {
  dealAddress: string;
  netProfit?: number;
  roi?: number;
  score?: number;
  risk?: string;
  downloadUrl?: string;
  packageContents?: string[];
}): string {
  const { dealAddress, netProfit, roi, score, risk, downloadUrl, packageContents } = params;

  const kpis: Kpi[] = [
    { label: "Est. Net Profit", value: money(netProfit) },
    { label: "Est. ROI", value: pct(roi) },
    { label: "Score / Risk", value: `${Number(score ?? 0)}/100 • ${esc(risk ?? "N/A")}` },
    { label: "Package", value: "Full Deal Package (.zip)" },
  ];

  const body = `
    <div style="font-size:14px; color:#111827; font-weight:700; margin-bottom:10px;">Full Deal Package Ready</div>
    ${kpiGrid(kpis)}
    <div style="margin-top:16px; font-size:14px; color:#111827; font-weight:700;">What’s inside</div>
    <div style="margin-top:8px; font-size:13px; color:#374151; line-height:1.5;">
      ${bulletList(
        packageContents?.length
          ? packageContents
          : [
              "Deal analysis + key metrics",
              "Rehab scope summary (if available)",
              "Comps / market intelligence (if available)",
              "Exported charts & supporting data",
            ]
      )}
    </div>
  `;

  return layout({
    title: "Exported Deal Package",
    subtitle: dealAddress,
    bodyHtml: body,
    ctaUrl: downloadUrl,
    ctaLabel: downloadUrl ? "Download Full Package (.zip)" : undefined,
  });
}

