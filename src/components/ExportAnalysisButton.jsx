
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import { useToast } from '@/components/ui/use-toast';

const ExportAnalysisButton = ({ deal, metrics, propertyIntelligence, sowData, scenarios, pageRef }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filename = `Analysis-${(deal?.address || 'deal').replace(/\s+/g, '-')}.pdf`;

      if (pageRef?.current) {
        await html2pdf()
          .set({
            margin: 10,
            filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: 'tr' },
          })
          .from(pageRef.current)
          .save();
        toast({ title: "Report Downloaded", description: "Full page PDF is ready." });
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text("Investment Analysis Report", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Deal Executive Summary", 14, 40);
      
      const summaryData = [
        ['Address', deal.address],
        ['Purchase Price', `$${deal.purchase_price?.toLocaleString()}`],
        ['ARV', `$${deal.arv?.toLocaleString()}`],
        ['Rehab Budget', `$${deal.rehab_costs?.toLocaleString()}`],
        ['Deal Score', `${metrics?.score ?? 0}/100`],
        ['Est. Net Profit', `$${metrics?.netProfit?.toLocaleString() ?? 0}`],
        ['Est. ROI', `${metrics?.roi?.toFixed(1) ?? 0}%`]
      ];
      
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [63, 180, 224] }
      });

      let finalY = doc.lastAutoTable?.finalY ?? 60;
      finalY += 15;
      
      if (propertyIntelligence?.propertySpecs) {
         doc.text("Property Specifications", 14, finalY);
         const specs = propertyIntelligence.propertySpecs;
         const specRows = [
            ['Type', specs.propertyType],
            ['Year Built', specs.yearBuilt],
            ['SqFt', specs.squareFootage],
            ['Beds/Baths', `${specs.bedrooms} / ${specs.bathrooms}`],
            ['Zoning', specs.zoning],
            ['School District', specs.schoolDistrict]
         ];
         autoTable(doc, {
            startY: finalY + 5,
            body: specRows,
            theme: 'grid'
         });
         finalY = doc.lastAutoTable?.finalY + 15;
      }

      doc.text("Financial Breakdown", 14, finalY);
      const finData = [
        ['Acquisition Costs', `$${metrics?.acquisition?.total?.toLocaleString() ?? 0}`],
        ['Hard Money Costs', `$${metrics?.hardMoney?.total?.toLocaleString() ?? 0}`],
        ['Rehab Costs', `$${metrics?.rehab?.total?.toLocaleString() ?? 0}`],
        ['Holding Costs', `$${metrics?.holding?.total?.toLocaleString() ?? 0}`],
        ['Selling Costs', `$${metrics?.selling?.total?.toLocaleString() ?? 0}`],
        ['TOTAL PROJECT COST', `$${metrics?.totalProjectCost?.toLocaleString() ?? 0}`]
      ];
      autoTable(doc, {
         startY: finalY + 5,
         body: finData,
         theme: 'plain',
         columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
      });

      doc.save(filename);
      toast({ title: "Report Downloaded", description: "Your PDF analysis is ready." });
      
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Export Failed", description: error?.message ?? "Could not generate PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-3">
       <Button onClick={handleExport} disabled={isExporting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
          <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
          {isExporting ? 'Generating PDF...' : 'Export Full Analysis'}
       </Button>
       <Button variant="outline" className="border-border text-foreground hover:bg-accent">
          <Mail className="w-4 h-4 mr-2" /> Email
       </Button>
    </div>
  );
};

export default ExportAnalysisButton;
