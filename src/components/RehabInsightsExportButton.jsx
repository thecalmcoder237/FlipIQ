import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { buildRehabInsightsHtml } from '@/utils/printReportUtils';

const RehabInsightsExportButton = ({ deal, metrics, propertyIntelligence, sowData, photos }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const html = buildRehabInsightsHtml(
        { deal, metrics, propertyIntelligence, sowData, photos },
        { autoPrint: false }
      );
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rehab-Insights-${(deal?.address ?? 'report').replace(/\s+/g, '-').substring(0, 30)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Report Downloaded', description: 'Your Rehab Insights report (HTML) is ready.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Export Failed', description: error?.message || 'Could not generate report.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
      <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'Generating...' : 'Export Rehab Insights'}
    </Button>
  );
};

export default RehabInsightsExportButton;
