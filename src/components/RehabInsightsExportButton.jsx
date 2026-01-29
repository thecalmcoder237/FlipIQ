import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/components/ui/use-toast';
import { extractSOWTotalCost, extractSOWTimeline } from '@/utils/sowParser';

const RehabInsightsExportButton = ({ deal, metrics, propertyIntelligence, sowData, photos }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;
      
      // 1. Header
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text("Rehab Insights & Deal Analysis Report", 14, yPos);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      yPos += 8;
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, yPos);
      yPos += 5;
      doc.text(`Property: ${deal.address}`, 14, yPos);
      yPos += 15;

      // 2. Deal Summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Deal Executive Summary", 14, yPos);
      yPos += 5;
      
      const summaryData = [
        ['Address', deal.address],
        ['Purchase Price', `$${deal.purchase_price?.toLocaleString() || '0'}`],
        ['ARV', `$${deal.arv?.toLocaleString() || '0'}`],
        ['Current Rehab Budget', `$${deal.rehab_costs?.toLocaleString() || '0'}`],
        ['Deal Score', `${metrics?.score || 0}/100`],
        ['Est. Net Profit', `$${metrics?.netProfit?.toLocaleString() || '0'}`],
        ['Est. ROI', `${metrics?.roi?.toFixed(1) || '0'}%`]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });
      yPos = doc.lastAutoTable.finalY + 15;

      // 3. Property Specifications
      if (propertyIntelligence) {
        doc.setFontSize(14);
        doc.text("Property Specifications", 14, yPos);
        yPos += 5;
        
        const specs = [];
        Object.entries(propertyIntelligence).forEach(([key, val]) => {
          if (key !== 'recentComps' && typeof val !== 'object' && val !== null) {
            specs.push([key.replace(/([A-Z])/g, ' $1').trim(), String(val)]);
          }
        });
        
        if (specs.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Specification', 'Value']],
            body: specs,
            theme: 'grid'
          });
          yPos = doc.lastAutoTable.finalY + 15;
        }
      }

      // 4. Photos Summary
      if (photos && photos.length > 0) {
        doc.setFontSize(14);
        doc.text("Site Photos", 14, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.text(`Total Photos Uploaded: ${photos.length}`, 14, yPos);
        yPos += 5;
        doc.text("Photo Analysis Summary:", 14, yPos);
        yPos += 5;
        
        photos.forEach((photo, idx) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(9);
          doc.text(`Photo ${idx + 1}: ${photo.analysis?.condition || 'Analyzed'}`, 20, yPos);
          if (photo.analysis?.observations) {
            yPos += 4;
            doc.text(photo.analysis.observations.substring(0, 80) + '...', 20, yPos, { maxWidth: 170 });
          }
          yPos += 8;
        });
        yPos += 5;
      }

      // 5. Scope of Work
      if (sowData) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text("Generated Scope of Work", 14, yPos);
        yPos += 5;
        
        const sowEstimate = extractSOWTotalCost(sowData);
        const sowTimeline = extractSOWTimeline(sowData);
        
        if (sowEstimate) {
          doc.setFontSize(10);
          doc.text(`SOW Estimated Cost: $${sowEstimate.toLocaleString()}`, 14, yPos);
          yPos += 5;
        }
        if (sowTimeline) {
          doc.text(`Estimated Timeline: ${sowTimeline} weeks`, 14, yPos);
          yPos += 5;
        }
        
        // Add SOW text (truncated if too long)
        doc.setFontSize(9);
        const sowLines = sowData.split('\n').slice(0, 50); // Limit to first 50 lines
        sowLines.forEach((line, idx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line.substring(0, 90), 14, yPos, { maxWidth: 180 });
          yPos += 5;
        });
        
        if (sowData.split('\n').length > 50) {
          yPos += 3;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text("... (SOW truncated for PDF - see full version in app)", 14, yPos);
          doc.setTextColor(0, 0, 0);
        }
        yPos += 10;
      }

      // 6. Budget Comparison
      if (sowData && deal.rehab_costs) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text("Budget Comparison", 14, yPos);
        yPos += 5;
        
        const sowEstimate = extractSOWTotalCost(sowData);
        if (sowEstimate) {
          const difference = sowEstimate - deal.rehab_costs;
          const percentDiff = ((difference / deal.rehab_costs) * 100).toFixed(1);
          
          const comparisonData = [
            ['Current Rehab Budget', `$${deal.rehab_costs.toLocaleString()}`],
            ['SOW Visual Analysis Estimate', `$${sowEstimate.toLocaleString()}`],
            ['Variance', `$${Math.abs(difference).toLocaleString()} (${difference > 0 ? '+' : ''}${percentDiff}%)`]
          ];
          
          autoTable(doc, {
            startY: yPos,
            head: [['Item', 'Amount']],
            body: comparisonData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
          });
          yPos = doc.lastAutoTable.finalY + 10;
        }
      }

      // 7. Financial Breakdown
      if (metrics) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text("Financial Breakdown", 14, yPos);
        yPos += 5;
        
        const finData = [
          ['Acquisition Costs', `$${metrics.acquisition?.total?.toLocaleString() || '0'}`],
          ['Hard Money Costs', `$${metrics.hardMoney?.total?.toLocaleString() || '0'}`],
          ['Rehab Costs', `$${metrics.rehab?.total?.toLocaleString() || '0'}`],
          ['Holding Costs', `$${metrics.holding?.total?.toLocaleString() || '0'}`],
          ['Selling Costs', `$${metrics.selling?.total?.toLocaleString() || '0'}`],
          ['TOTAL PROJECT COST', `$${metrics.totalProjectCost?.toLocaleString() || '0'}`]
        ];
        
        autoTable(doc, {
          startY: yPos,
          body: finData,
          theme: 'plain',
          columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
        });
      }

      // Save
      const fileName = `Rehab-Insights-${deal.address.replace(/\s+/g, '-').substring(0, 30)}.pdf`;
      doc.save(fileName);
      toast({ title: "Report Downloaded", description: "Your Rehab Insights PDF is ready." });
      
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
      <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'Generating PDF...' : 'Export Rehab Insights'}
    </Button>
  );
};

export default RehabInsightsExportButton;
