
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/components/ui/use-toast';

const ExportAnalysisButton = ({ deal, metrics, propertyIntelligence, sowData, scenarios }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // 1. Header
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text("Investment Analysis Report", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

      // 2. Deal Summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Deal Executive Summary", 14, 40);
      
      const summaryData = [
        ['Address', deal.address],
        ['Purchase Price', `$${deal.purchase_price?.toLocaleString()}`],
        ['ARV', `$${deal.arv?.toLocaleString()}`],
        ['Rehab Budget', `$${deal.rehab_costs?.toLocaleString()}`],
        ['Deal Score', `${metrics.score}/100`],
        ['Est. Net Profit', `$${metrics.netProfit?.toLocaleString()}`],
        ['Est. ROI', `${metrics.roi?.toFixed(1)}%`]
      ];
      
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });

      // 3. Property Intelligence
      let finalY = doc.lastAutoTable.finalY + 15;
      
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
         finalY = doc.lastAutoTable.finalY + 15;
      }

      // 4. Financial Breakdown
      doc.text("Financial Breakdown", 14, finalY);
      const finData = [
        ['Acquisition Costs', `$${metrics.acquisition.total?.toLocaleString()}`],
        ['Hard Money Costs', `$${metrics.hardMoney.total?.toLocaleString()}`],
        ['Rehab Costs', `$${metrics.rehab.total?.toLocaleString()}`],
        ['Holding Costs', `$${metrics.holding.total?.toLocaleString()}`],
        ['Selling Costs', `$${metrics.selling.total?.toLocaleString()}`],
        ['TOTAL PROJECT COST', `$${metrics.totalProjectCost?.toLocaleString()}`]
      ];
      autoTable(doc, {
         startY: finalY + 5,
         body: finData,
         theme: 'plain',
         columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
      });

      // Save
      doc.save(`Analysis-${deal.address.replace(/\s+/g, '-')}.pdf`);
      toast({ title: "Report Downloaded", description: "Your PDF analysis is ready." });
      
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-3">
       <Button onClick={handleExport} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
          <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
          {isExporting ? 'Generating PDF...' : 'Export Full Analysis'}
       </Button>
       <Button variant="outline" className="text-gray-300 border-white/20 hover:bg-slate-800">
          <Mail className="w-4 h-4 mr-2" /> Email
       </Button>
    </div>
  );
};

export default ExportAnalysisButton;
