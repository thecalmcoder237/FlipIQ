
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PDFReportPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dealId = searchParams.get('id');

  const [deal, setDeal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadDeal = async () => {
      if (!dealId) {
        navigate('/deal-input');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .eq('id', dealId)
          .single();

        if (error) throw error;

        setDeal(data);
        const calculatedMetrics = calculateDealMetrics(data);
        setMetrics(calculatedMetrics);
      } catch (error) {
        console.error('Error loading deal:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Deal",
          description: error.message,
        });
        navigate('/deal-input');
      } finally {
        setLoading(false);
      }
    };

    loadDeal();
  }, [dealId, navigate, toast]);

  const generatePDF = () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Header
      doc.setFontSize(24);
      // Primary #3FB4E0
      doc.setTextColor(63, 180, 224);
      doc.text('House Flip Deal Analysis Report', 105, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(new Date().toLocaleDateString(), 105, yPos, { align: 'center' });

      // Property Information
      yPos += 15;
      doc.setFontSize(16);
      doc.setTextColor(63, 180, 224);
      doc.text('Property Information', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const propertyInfo = [
        ['Address:', deal.address],
        ['Bedrooms:', deal.bedrooms],
        ['Bathrooms:', deal.bathrooms],
        ['Square Feet:', deal.sqft?.toLocaleString()],
        ['Year Built:', deal.year_built],
        ['ZIP Code:', deal.zip_code],
        ['Exit Strategy:', deal.exit_strategy],
      ];

      propertyInfo.forEach(([label, value]) => {
        doc.text(`${label}`, 20, yPos);
        doc.text(`${value || 'N/A'}`, 100, yPos);
        yPos += 7;
      });

      // Financial Summary
      yPos += 5;
      doc.setFontSize(16);
      doc.setTextColor(63, 180, 224);
      doc.text('Financial Summary', 20, yPos);
      
      yPos += 10;
      doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Purchase Price', `$${metrics.purchasePrice.toLocaleString()}`],
          ['After Repair Value (ARV)', `$${metrics.arv.toLocaleString()}`],
          ['Rehab Costs', `$${metrics.rehabCosts.toLocaleString()}`],
          ['Total Investment', `$${metrics.totalInvestment.toLocaleString()}`],
          ['Total Costs', `$${metrics.totalCosts.toLocaleString()}`],
          ['Net Profit', `$${metrics.netProfit.toLocaleString()}`],
          ['ROI', `${metrics.roi.toFixed(2)}%`],
          ['Cash-on-Cash Return', `${metrics.cashOnCashReturn.toFixed(2)}%`],
          ['Profit Margin', `${metrics.profitMargin.toFixed(2)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [63, 180, 224] },
        margin: { left: 20, right: 20 },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Cost Breakdown
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(63, 180, 224);
      doc.text('Detailed Cost Breakdown', 20, yPos);
      
      yPos += 10;
      doc.autoTable({
        startY: yPos,
        head: [['Category', 'Amount']],
        body: [
          ['Purchase Price', `$${metrics.purchasePrice.toLocaleString()}`],
          ['Down Payment', `$${metrics.downPayment.toLocaleString()}`],
          ['Loan Amount', `$${metrics.loanAmount.toLocaleString()}`],
          ['Rehab Costs', `$${metrics.rehabCosts.toLocaleString()}`],
          ['Acquisition Costs', `$${metrics.acquisitionCosts.toLocaleString()}`],
          ['Holding Costs', `$${metrics.holdingCosts.toLocaleString()}`],
          ['Total Interest', `$${metrics.totalInterest.toLocaleString()}`],
          ['Loan Points', `$${metrics.loanPoints.toLocaleString()}`],
          ['Realtor Commission', `$${metrics.realtorCommission.toLocaleString()}`],
          ['Closing Costs', `$${metrics.closingCosts.toLocaleString()}`],
          ['Staging Costs', `$${metrics.stagingCosts.toLocaleString()}`],
          ['Contingency Buffer', `$${metrics.contingencyBuffer.toLocaleString()}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [63, 180, 224] },
        margin: { left: 20, right: 20 },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Risk Analysis
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(63, 180, 224);
      doc.text('Risk-Adjusted Analysis', 20, yPos);
      
      yPos += 10;
      doc.autoTable({
        startY: yPos,
        head: [['Risk Factor', 'Value']],
        body: [
          ['Adjusted ARV', `$${metrics.adjustedARV.toLocaleString()}`],
          ['Adjusted Rehab Costs', `$${metrics.adjustedRehabCosts.toLocaleString()}`],
          ['Risk-Adjusted Profit', `$${metrics.riskAdjustedProfit.toLocaleString()}`],
          ['Break-Even Price', `$${metrics.breakEvenPrice.toLocaleString()}`],
          ['Break-Even Margin', `${metrics.breakEvenMargin.toFixed(2)}%`],
          ['Holding Period', `${metrics.holdingMonths} months`],
          ['Expected Days on Market', `${metrics.daysOnMarket} days`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [63, 180, 224] },
        margin: { left: 20, right: 20 },
      });

      // Comps (if available)
      if (deal.comps && deal.comps.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(16);
        doc.setTextColor(63, 180, 224);
        doc.text('Comparable Properties', 20, yPos);
        
        yPos += 10;
        const compsData = deal.comps.map(comp => [
          comp.address,
          `$${comp.price.toLocaleString()}`,
          `${comp.bedrooms}/${comp.bathrooms}`,
          `${comp.sqft.toLocaleString()} sqft`,
          `${comp.daysOnMarket} days`,
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Address', 'Price', 'Beds/Baths', 'Sqft', 'DOM']],
          body: compsData,
          theme: 'grid',
          headStyles: { fillColor: [63, 180, 224] },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 },
        });
      }

      // Footer on last page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          105,
          285,
          { align: 'center' }
        );
        doc.text(
          'FlipIQ - Real Estate Deal Analysis',
          105,
          290,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `deal-analysis-${deal.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Generated!",
        description: "Your deal analysis report has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Error Generating PDF",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-background to-muted">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground text-lg">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (!deal || !metrics) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>PDF Report - {deal.address} | FlipIQ</title>
        <meta name="description" content={`Generate PDF report for ${deal.address} using FlipIQ`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate(`/deal-analysis?id=${dealId}`)}
            variant="ghost"
            className="mb-8 text-foreground hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analysis
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card backdrop-blur-xl rounded-3xl shadow-xl p-12 border border-border text-center"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-accentBrand rounded-3xl mb-8">
              <FileText className="w-12 h-12 text-primary-foreground" />
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-4">
              Generate PDF Report
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              {deal.address}
            </p>
            <p className="text-muted-foreground mb-12">
              Create a comprehensive PDF report with all deal details, calculations, and comparable properties.
            </p>

            <Button
              onClick={generatePDF}
              disabled={generating}
              className="bg-gradient-to-r from-primary to-accentBrand hover:from-primary/90 hover:to-accentBrand/90 text-primary-foreground font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 text-lg"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Generating PDF...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download PDF Report
                </span>
              )}
            </Button>

            <div className="mt-12 p-6 bg-primary/20 rounded-2xl border border-primary/30">
              <h2 className="text-lg font-bold text-foreground mb-3">Report Includes:</h2>
              <ul className="text-left text-muted-foreground space-y-2 max-w-md mx-auto">
                <li>✓ Complete property information</li>
                <li>✓ Financial summary & key metrics</li>
                <li>✓ Detailed cost breakdown</li>
                <li>✓ Risk-adjusted analysis</li>
                <li>✓ Comparable properties (if fetched)</li>
                <li>✓ Professional formatting</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default PDFReportPage;
