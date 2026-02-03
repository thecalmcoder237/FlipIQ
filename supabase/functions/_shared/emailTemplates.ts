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
      <td style="padding:8px 8px 0 0; vertical-align:top;">
        <div style="border:1px solid #E5E7EB; border-radius:12px; padding:14px 16px; background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%); box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size:11px; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">${esc(k.label)}</div>
          <div style="font-size:18px; font-weight:700; color:#0F172A;">${esc(k.value)}</div>
        </div>
      </td>`
    )
    .join("");

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
    .map((t) => `<li style="margin:0 0 10px 0; color:#374151; line-height:1.5;">${esc(t)}</li>`)
    .join("");
  return `<ul style="margin:0; padding:0 0 0 22px;">${li}</ul>`;
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
      <div style="margin-top:24px;">
        <a href="${esc(ctaUrl)}" style="display:inline-block; background:linear-gradient(135deg, #EA580C 0%, #C2410C 100%); color:#FFFFFF; text-decoration:none; padding:14px 24px; border-radius:10px; font-weight:700; font-size:15px; box-shadow:0 4px 14px rgba(234,88,12,0.35);">
          ${esc(ctaLabel)}
        </a>
      </div>`
      : "";

  return `
  <div style="background:linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%); padding:28px 16px; font-family:ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; max-width:680px; margin:0 auto;">
      <tr>
        <td style="padding:0 0 16px 0;">
          <div style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius:16px; padding:22px 24px; box-shadow:0 4px 20px rgba(15,23,42,0.25);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td style="vertical-align:top;">
                  <div style="color:#FBBF24; font-weight:800; letter-spacing:1px; font-size:12px;">FLIPIQ</div>
                  <div style="color:#FFFFFF; font-size:22px; font-weight:800; margin-top:8px; letter-spacing:-0.5px;">${esc(title)}</div>
                  <div style="color:#94A3B8; font-size:14px; margin-top:8px;">${esc(subtitle)}</div>
                </td>
                <td style="text-align:right; vertical-align:top; color:#94A3B8; font-size:12px;">
                  ${headerRight ? esc(headerRight) : esc(new Date().toLocaleDateString())}
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <td>
          <div style="background:#FFFFFF; border-radius:16px; padding:24px; border:1px solid #E2E8F0; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            ${bodyHtml}
            ${cta}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 8px 0 8px; color:#64748B; font-size:12px; text-align:center;">
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
    <div style="font-size:13px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">Deal Snapshot</div>
    ${kpiGrid(kpis)}
    <div style="margin-top:24px; font-size:15px; color:#0F172A; font-weight:700; border-bottom:2px solid #EA580C; padding-bottom:8px; margin-bottom:12px;">Summary</div>
    <div style="font-size:14px; color:#475569; line-height:1.6;">
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
    <div style="font-size:13px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">Loan Proposal Snapshot</div>
    ${kpiGrid(kpis)}
    <div style="margin-top:24px; font-size:15px; color:#0F172A; font-weight:700; border-bottom:2px solid #EA580C; padding-bottom:8px; margin-bottom:12px;">Lender Request</div>
    <div style="font-size:14px; color:#475569; line-height:1.6;">
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
    <div style="font-size:13px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">Full Deal Package Ready</div>
    ${kpiGrid(kpis)}
    <div style="margin-top:24px; font-size:15px; color:#0F172A; font-weight:700; border-bottom:2px solid #EA580C; padding-bottom:8px; margin-bottom:12px;">What's inside</div>
    <div style="font-size:14px; color:#475569; line-height:1.6;">
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

