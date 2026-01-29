import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/utils/proposalTemplate";
import { calculate70RuleMAO } from "@/utils/advancedDealCalculations";

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function safeStr(v) {
  if (v === null || v === undefined) return "N/A";
  const s = String(v).trim();
  return s.length ? s : "N/A";
}

function sectionTitle(doc, title, y, colors) {
  const { primary, slate } = colors;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...slate);
  doc.text(title, 14, y);
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.6);
  doc.line(14, y + 2, 196, y + 2);
  return y + 10;
}

function ensureSpace(doc, y, needed = 30) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawCostBars(doc, y, metrics, colors) {
  const { primary, muted, slate } = colors;
  const left = 14;
  const width = 182;
  const barH = 8;
  const gap = 8;

  const acquisition = safeNum(metrics?.acquisition?.total);
  const hardMoney = safeNum(metrics?.hardMoney?.total);
  const rehab = safeNum(metrics?.rehab?.total ?? metrics?.rehabCosts);
  const holding = safeNum(metrics?.holding?.total);
  const selling = safeNum(metrics?.selling?.total);
  const total = acquisition + hardMoney + rehab + holding + selling;

  const rows = [
    ["Acquisition", acquisition],
    ["Hard Money", hardMoney],
    ["Rehab", rehab],
    ["Holding", holding],
    ["Selling", selling],
  ].filter(([, v]) => v > 0);

  if (!rows.length || total <= 0) return y;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slate);

  let yy = y;
  rows.forEach(([label, value]) => {
    const pct = value / total;
    const w = Math.max(2, Math.round(width * pct));

    doc.setFillColor(...muted);
    doc.rect(left, yy - barH + 2, width, barH, "F");
    doc.setFillColor(...primary);
    doc.rect(left, yy - barH + 2, w, barH, "F");

    doc.text(label, left, yy + 4);
    doc.text(`${formatCurrency(value)} (${(pct * 100).toFixed(0)}%)`, left + width, yy + 4, { align: "right" });
    yy += barH + gap;
  });

  return yy + 4;
}

export function generateFullAnalysisReportPDF({
  deal,
  metrics,
  propertyIntelligence,
  rehabSow,
  scenarios,
  notes,
}) {
  const doc = new jsPDF();
  const colors = {
    primary: [41, 128, 185], // blue
    slate: [30, 41, 59],
    muted: [243, 244, 246],
    gray: [107, 114, 128],
  };

  // Cover/Header
  doc.setFillColor(...colors.slate);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FULL DEAL ANALYSIS REPORT", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  doc.setTextColor(...colors.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(safeStr(deal?.address), 196, 28, { align: "right" });

  let y = 46;

  // Executive Summary
  y = sectionTitle(doc, "Executive Summary", y, colors);
  const score = safeNum(metrics?.score);
  const risk = safeStr(metrics?.risk);
  const netProfit = safeNum(metrics?.netProfit);
  const roi = safeNum(metrics?.roi);
  const arv = safeNum(metrics?.arv ?? deal?.arv);
  const purchase = safeNum(deal?.purchasePrice ?? deal?.purchase_price);
  const rehab = safeNum(deal?.rehab_costs ?? deal?.rehabCosts);
  const mao = arv > 0 ? calculate70RuleMAO(arv, rehab, false) : 0;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Address", safeStr(deal?.address)],
      ["Purchase Price", formatCurrency(purchase)],
      ["After Repair Value (ARV)", formatCurrency(arv)],
      ["Rehab Budget", formatCurrency(rehab)],
      ["Max Allowable Offer (MAO)", formatCurrency(mao)],
      ["Deal Score / Risk", `${score}/100 • ${risk}`],
      ["Est. Net Profit", formatCurrency(netProfit)],
      ["Est. ROI", `${roi.toFixed(1)}%`],
    ],
    theme: "striped",
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  y = ensureSpace(doc, y, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.slate);
  doc.text("Where the money goes (cost mix)", 14, y);
  y += 6;
  y = drawCostBars(doc, y, metrics, colors);

  // Property & Deal Details
  y = ensureSpace(doc, y, 60);
  y = sectionTitle(doc, "Property Details", y, colors);
  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Beds / Baths", `${safeStr(deal?.bedrooms)} / ${safeStr(deal?.bathrooms)}`],
      ["Sqft", safeStr(deal?.sqft)],
      ["Year Built", safeStr(deal?.year_built)],
      ["ZIP", safeStr(deal?.zipCode ?? deal?.zip_code)],
      ["Exit Strategy", safeStr(deal?.exit_strategy)],
    ],
    theme: "grid",
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Financial Breakdown
  y = ensureSpace(doc, y, 80);
  y = sectionTitle(doc, "Financial Breakdown", y, colors);
  autoTable(doc, {
    startY: y,
    head: [["Category", "Amount"]],
    body: [
      ["Acquisition", formatCurrency(safeNum(metrics?.acquisition?.total))],
      ["Hard Money", formatCurrency(safeNum(metrics?.hardMoney?.total))],
      ["Rehab", formatCurrency(safeNum(metrics?.rehab?.total ?? metrics?.rehabCosts))],
      ["Holding", formatCurrency(safeNum(metrics?.holding?.total))],
      ["Selling", formatCurrency(safeNum(metrics?.selling?.total))],
      ["Total Project Cost", formatCurrency(safeNum(metrics?.totalProjectCost ?? metrics?.totalCosts))],
    ],
    theme: "striped",
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Property Intelligence (optional)
  if (propertyIntelligence) {
    y = ensureSpace(doc, y, 70);
    y = sectionTitle(doc, "Property Intelligence (if available)", y, colors);
    const rows = [];
    Object.entries(propertyIntelligence).forEach(([k, v]) => {
      if (k === "recentComps") return;
      if (v && typeof v === "object") return;
      rows.push([k.replace(/([A-Z])/g, " $1").trim(), safeStr(v)]);
    });
    if (rows.length) {
      autoTable(doc, {
        startY: y,
        head: [["Item", "Value"]],
        body: rows.slice(0, 25),
        theme: "grid",
        headStyles: { fillColor: colors.primary },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...colors.gray);
      doc.text("No property intelligence fields found.", 14, y);
      y += 10;
    }

    const comps = propertyIntelligence?.recentComps;
    if (Array.isArray(comps) && comps.length) {
      y = ensureSpace(doc, y, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...colors.slate);
      doc.text("Recent Comps", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Address", "Price", "Beds/Baths", "Sqft", "DOM"]],
        body: comps.slice(0, 12).map((c) => [
          safeStr(c?.address),
          c?.price ? formatCurrency(c.price) : safeStr(c?.salePrice),
          `${safeStr(c?.bedrooms)} / ${safeStr(c?.bathrooms)}`,
          safeStr(c?.sqft),
          safeStr(c?.daysOnMarket ?? c?.dom),
        ]),
        theme: "grid",
        headStyles: { fillColor: colors.primary },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }
  }

  // Rehab SOW (optional summary)
  if (rehabSow) {
    y = ensureSpace(doc, y, 70);
    y = sectionTitle(doc, "Rehab Scope Summary (if available)", y, colors);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.slate);
    const lines = doc.splitTextToSize(String(rehabSow).slice(0, 2200), 182);
    doc.text(lines.slice(0, 40), 14, y);
    y += Math.min(40, lines.length) * 5 + 6;
    if (lines.length > 40) {
      doc.setTextColor(...colors.gray);
      doc.text("... (truncated — see full version in app)", 14, y);
      y += 8;
    }
  }

  // Scenarios (optional)
  if (scenarios && typeof scenarios === "object") {
    y = ensureSpace(doc, y, 70);
    y = sectionTitle(doc, "Scenario Summary (if available)", y, colors);
    const entries = Object.entries(scenarios).slice(0, 10);
    if (entries.length) {
      autoTable(doc, {
        startY: y,
        head: [["Scenario", "Summary"]],
        body: entries.map(([name, val]) => [safeStr(name), safeStr(val)]),
        theme: "grid",
        headStyles: { fillColor: colors.primary },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }
  }

  // Notes (optional)
  if (notes) {
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, "Notes (if available)", y, colors);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.slate);
    const lines = doc.splitTextToSize(String(notes).slice(0, 1200), 182);
    doc.text(lines.slice(0, 25), 14, y);
    y += Math.min(25, lines.length) * 5 + 6;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    doc.text(`FlipIQ • Full Deal Analysis • Page ${i} of ${pageCount}`, 105, 292, { align: "center" });
  }

  return doc;
}

