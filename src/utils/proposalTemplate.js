
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Helper Functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Main Generator Function
export const generateLoanProposalPDF = (deal, metrics, loanTerms, borrowerInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Colors
  const primaryColor = [218, 165, 32]; // Gold
  const secondaryColor = [30, 41, 59]; // Slate 900
  const textColor = [60, 60, 60];

  // Branding Header
  doc.setFillColor(...secondaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVESTMENT LOAN PROPOSAL", margin, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - margin, 25, { align: 'right' });

  // 1. Executive Summary
  let yPos = 55;
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", margin, yPos);
  
  doc.setDrawColor(...primaryColor);
  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);

  yPos += 15;
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const summaryText = `We are requesting a loan of ${formatCurrency(loanTerms.loanAmount)} for the acquisition and renovation of the property located at ${deal.address}. This project represents a lucrative fix-and-flip opportunity with a projected profit of ${formatCurrency(metrics.netProfit)} and an ROI of ${metrics.roi.toFixed(1)}%.`;
  
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - (margin * 2));
  doc.text(splitSummary, margin, yPos);
  yPos += (splitSummary.length * 7) + 10;

  // 2. Property Overview & Key Metrics Grid
  doc.setFont("helvetica", "bold");
  doc.text("PROPERTY & DEAL METRICS", margin, yPos);
  yPos += 10;

  const metricsData = [
    ["Purchase Price", formatCurrency(deal.purchase_price), "After Repair Value (ARV)", formatCurrency(deal.arv)],
    ["Rehab Budget", formatCurrency(deal.rehab_costs), "Est. Net Profit", formatCurrency(metrics.netProfit)],
    ["Property Type", "Single Family (Est.)", "Project Timeline", `${deal.holding_months || 6} Months`],
    ["Total Project Cost", formatCurrency(metrics.totalProjectCost), "Return on Investment", `${metrics.roi.toFixed(1)}%`]
  ];

  doc.autoTable({
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

  yPos = doc.lastAutoTable.finalY + 20;

  // 3. Loan Terms Requested
  doc.setFontSize(16);
  doc.setTextColor(...secondaryColor);
  doc.text("LOAN TERMS REQUESTED", margin, yPos);
  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
  yPos += 15;

  const loanData = [
    ["Loan Amount", formatCurrency(loanTerms.loanAmount)],
    ["Interest Rate", `${loanTerms.interestRate}%`],
    ["Term Length", `${loanTerms.termMonths} Months`],
    ["LTV (Purchase)", `${((loanTerms.loanAmount / deal.purchase_price) * 100).toFixed(1)}%`],
    ["LTV (ARV)", `${((loanTerms.loanAmount / deal.arv) * 100).toFixed(1)}%`],
    ["Use of Funds", "Acquisition + Rehab Costs"]
  ];

  doc.autoTable({
    startY: yPos,
    body: loanData,
    theme: 'striped',
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: 'bold', width: 80 } }
  });
  
  yPos = doc.lastAutoTable.finalY + 20;

  // 4. Borrower Qualifications
  doc.setFontSize(16);
  doc.setTextColor(...secondaryColor);
  doc.text("BORROWER QUALIFICATIONS", margin, yPos);
  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
  yPos += 15;

  const borrowerData = [
    ["Borrower Name", borrowerInfo.name || "N/A"],
    ["Experience Level", borrowerInfo.experience || "Intermediate"],
    ["Credit Score Range", borrowerInfo.creditScore || "700+"],
    ["Liquidity Available", formatCurrency(borrowerInfo.liquidity || 0)],
    ["Track Record", borrowerInfo.trackRecord || "Detailed track record available upon request."]
  ];

  doc.autoTable({
    startY: yPos,
    body: borrowerData,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
  });

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
