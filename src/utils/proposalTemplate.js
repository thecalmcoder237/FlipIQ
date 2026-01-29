
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper Functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const safeNum = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
};

const safeStr = (v) => {
  if (v === null || v === undefined) return "N/A";
  const s = String(v).trim();
  return s.length ? s : "N/A";
};

const ensureSpace = (doc, y, needed = 28, top = 20) => {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    doc.addPage();
    return top;
  }
  return y;
};

const sectionTitle = (doc, title, margin, y, colors) => {
  doc.setTextColor(...colors.secondaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  doc.setDrawColor(...colors.primaryColor);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, doc.internal.pageSize.getWidth() - margin, y + 2);
  return y + 10;
};

// Main Generator Function
export const generateLoanProposalPDF = (deal, metrics, loanTerms, borrowerInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Colors
  const colors = {
    primaryColor: [218, 165, 32], // Gold
    secondaryColor: [30, 41, 59], // Slate 900
    textColor: [60, 60, 60],
    muted: [245, 245, 245],
    gray: [107, 114, 128],
  };

  const purchasePrice = safeNum(deal?.purchase_price ?? deal?.purchasePrice);
  const arv = safeNum(deal?.arv);
  const rehabBudget = safeNum(deal?.rehab_costs ?? deal?.rehabCosts);
  const totalProjectCost = safeNum(metrics?.totalProjectCost ?? metrics?.totalCosts);
  const netProfit = safeNum(metrics?.netProfit);
  const roi = safeNum(metrics?.roi);
  const score = safeNum(metrics?.score);
  const risk = safeStr(metrics?.risk);

  // Request: 80% ARV LTV
  const requestedLoanAmount = Math.round(arv * 0.8);
  const requestedLtvArv = arv > 0 ? (requestedLoanAmount / arv) * 100 : 0;
  const ltvPurchase = purchasePrice > 0 ? (requestedLoanAmount / purchasePrice) * 100 : 0;

  // Branding Header
  doc.setFillColor(...colors.secondaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(...colors.primaryColor);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVESTMENT LOAN PROPOSAL", margin, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - margin, 25, { align: 'right' });

  // Cover block
  let yPos = 55;
  doc.setTextColor(...colors.secondaryColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(safeStr(deal?.address), margin, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.gray);
  doc.text(`Borrower: ${safeStr(borrowerInfo?.name)}`, margin, yPos);
  doc.text(`Deal Score: ${score}/100 • Risk: ${risk}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 12;

  // 1. Executive Summary (narrative + request)
  yPos = sectionTitle(doc, "EXECUTIVE SUMMARY", margin, yPos, colors);
  doc.setTextColor(...colors.textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const summaryText = `We are seeking financing for the acquisition and renovation of ${safeStr(deal?.address)}. This is a fix-and-flip opportunity with a projected net profit of ${formatCurrency(netProfit)} and an estimated ROI of ${roi.toFixed(1)}%. We are requesting a loan of ${formatCurrency(requestedLoanAmount)} (80% ARV LTV) to support acquisition + rehab costs, structured with construction draws as needed.`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - (margin * 2));
  doc.text(splitSummary, margin, yPos);
  yPos += (splitSummary.length * 6) + 10;

  // Highlights / Pros
  yPos = ensureSpace(doc, yPos, 55);
  yPos = sectionTitle(doc, "DEAL HIGHLIGHTS (PROS)", margin, yPos, colors);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.textColor);

  const equitySpread = Math.max(0, arv - totalProjectCost);
  const bullets = [
    `Strong equity cushion: ARV ${formatCurrency(arv)} vs total project cost ${formatCurrency(totalProjectCost)} (spread ${formatCurrency(equitySpread)}).`,
    `Projected profitability: net profit ${formatCurrency(netProfit)} with ROI ${roi.toFixed(1)}%.`,
    `Clear renovation plan and defined value-add improvements (see Rehab Summary).`,
    `Comparable sales and market intelligence support the ARV (see Comps Summary).`,
  ];
  bullets.forEach((b) => {
    const lines = doc.splitTextToSize(`• ${b}`, pageWidth - (margin * 2));
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + 2;
  });

  // 2. Property Overview & Key Metrics Grid
  yPos = ensureSpace(doc, yPos, 70);
  yPos = sectionTitle(doc, "PROPERTY OVERVIEW & DEAL METRICS", margin, yPos, colors);

  const metricsData = [
    ["Purchase Price", formatCurrency(purchasePrice), "After Repair Value (ARV)", formatCurrency(arv)],
    ["Rehab Budget", formatCurrency(rehabBudget), "Est. Net Profit", formatCurrency(netProfit)],
    ["Property Type", safeStr(deal?.propertyType || "Single Family (Est.)"), "Project Timeline", `${safeStr(deal?.holding_months || deal?.holdingMonths || 6)} Months`],
    ["Total Project Cost", formatCurrency(totalProjectCost), "Return on Investment", `${roi.toFixed(1)}%`],
    ["Beds / Baths", `${safeStr(deal?.bedrooms)} / ${safeStr(deal?.bathrooms)}`, "Sqft", safeStr(deal?.sqft)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: metricsData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245], width: 40 },
      1: { width: 45 },
      2: { fontStyle: 'bold', fillColor: [245, 245, 245], width: 45 },
      3: { width: 40 }
    }
  });

  yPos = doc.lastAutoTable.finalY + 14;

  // 2b. Exit Strategy
  const exitStrategy = safeStr(deal?.exit_strategy ?? deal?.exitStrategy ?? "Fix and Flip (Wholesale/Retail)");
  yPos = ensureSpace(doc, yPos, 40);
  yPos = sectionTitle(doc, "EXIT STRATEGY", margin, yPos, colors);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.textColor);
  const exitLines = doc.splitTextToSize(exitStrategy, pageWidth - (margin * 2));
  doc.text(exitLines, margin, yPos);
  yPos += exitLines.length * 5 + 14;

  // 3. Loan Request (explicit 80% ARV LTV ask)
  yPos = ensureSpace(doc, yPos, 80);
  yPos = sectionTitle(doc, "LOAN REQUEST (80% ARV LTV)", margin, yPos, colors);

  const loanData = [
    ["Requested Loan Amount", formatCurrency(requestedLoanAmount)],
    ["Requested LTV (ARV)", `${requestedLtvArv.toFixed(1)}%`],
    ["Implied LTV (Purchase)", `${ltvPurchase.toFixed(1)}%`],
    ["Proposed Interest Rate", `${safeNum(loanTerms?.interestRate)}%`],
    ["Proposed Term Length", `${safeNum(loanTerms?.termMonths)} Months`],
    ["Points (if applicable)", `${safeNum(loanTerms?.points)} points`],
    ["Use of Funds", "Acquisition + Rehab (with draws)"],
  ];

  autoTable(doc, {
    startY: yPos,
    body: loanData,
    theme: 'striped',
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: 'bold', width: 80 } }
  });
  
  yPos = doc.lastAutoTable.finalY + 20;

  // 4. Borrower Qualifications
  yPos = ensureSpace(doc, yPos, 70);
  yPos = sectionTitle(doc, "BORROWER QUALIFICATIONS", margin, yPos, colors);

  const borrowerData = [
    ["Borrower Name", safeStr(borrowerInfo?.name)],
    ["Experience Level", safeStr(borrowerInfo?.experience || "Intermediate")],
    ["Credit Score Range", safeStr(borrowerInfo?.creditScore || "700+")],
    ["Liquidity Available", formatCurrency(safeNum(borrowerInfo?.liquidity || 0))],
    ["Track Record", safeStr(borrowerInfo?.trackRecord || "Detailed track record available upon request.")],
  ];

  autoTable(doc, {
    startY: yPos,
    body: borrowerData,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
  });

  yPos = doc.lastAutoTable.finalY + 14;

  // 5. Rehab Summary (optional, from deal if present)
  const rehabSow = deal?.rehabSow || deal?.rehab_sow || deal?.rehabSOW;
  if (rehabSow) {
    yPos = ensureSpace(doc, yPos, 90);
    yPos = sectionTitle(doc, "REHAB SUMMARY", margin, yPos, colors);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.textColor);
    const lines = doc.splitTextToSize(String(rehabSow).slice(0, 1800), pageWidth - (margin * 2));
    doc.text(lines.slice(0, 38), margin, yPos);
    yPos += Math.min(38, lines.length) * 5 + 6;
    if (lines.length > 38) {
      doc.setTextColor(...colors.gray);
      doc.text("... (truncated — see full version in app)", margin, yPos);
      yPos += 8;
    }
  }

  // 6. Comps Summary (optional, from deal or property intelligence)
  const comps = Array.isArray(deal?.comps) && deal.comps.length
    ? deal.comps
    : Array.isArray(deal?.propertyIntelligence?.recentComps)
      ? deal.propertyIntelligence.recentComps
      : [];
  if (comps.length) {
    yPos = ensureSpace(doc, yPos, 90);
    yPos = sectionTitle(doc, "COMPS SUMMARY (IF AVAILABLE)", margin, yPos, colors);
    autoTable(doc, {
      startY: yPos,
      head: [["Address", "Price", "Beds/Baths", "Sqft", "DOM"]],
      body: comps.slice(0, 10).map((c) => [
        safeStr(c?.address),
        c?.price ? formatCurrency(c.price) : safeStr(c?.salePrice || c?.soldPrice),
        `${safeStr(c?.bedrooms)} / ${safeStr(c?.bathrooms)}`,
        safeStr(c?.sqft),
        safeStr(c?.daysOnMarket ?? c?.dom),
      ]),
      theme: "grid",
      headStyles: { fillColor: colors.secondaryColor, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 },
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`FlipIQ powered by PAVEL REI - Investment Proposal | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  return doc;
};
