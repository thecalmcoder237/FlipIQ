
import React from 'react';
import { Award, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const DealQualityScore = ({ score, riskLevel }) => {
  console.log('DealQualityScore Render:', { score, riskLevel });

  let recommendation = "Pass";
  let colorClass = "text-red-500";
  let bgClass = "bg-red-500/10";
  let borderClass = "border-red-500/30";
  let ringColor = "border-red-500";
  
  if (score === null || score === undefined) {
      return (
          <Card className="bg-card border-border h-full shadow-sm">
            <CardContent className="flex flex-col items-center justify-center h-full py-8">
               <AlertTriangle className="text-accentMinimal w-8 h-8 mb-2" />
               <p className="text-muted-foreground text-sm">Score unavailable</p>
            </CardContent>
          </Card>
      );
  }

  if (score >= 80) {
    recommendation = "Strong Buy";
    colorClass = "text-green-500";
    bgClass = "bg-green-500/10";
    borderClass = "border-green-500/30";
    ringColor = "border-green-500";
  } else if (score >= 60) {
    recommendation = "Buy";
    colorClass = "text-emerald-400";
    bgClass = "bg-emerald-400/10";
    borderClass = "border-emerald-400/30";
    ringColor = "border-emerald-400";
  } else if (score >= 40) {
    recommendation = "Hold / Negotiate";
    colorClass = "text-yellow-400";
    bgClass = "bg-yellow-400/10";
    borderClass = "border-yellow-400/30";
    ringColor = "border-yellow-400";
  }

  return (
    <Card className="bg-card border-border h-full overflow-hidden relative shadow-sm">
      <div className={`absolute top-0 left-0 w-full h-1 ${bgClass} ${colorClass}`}></div>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Deal Quality Score</h3>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className={`relative w-32 h-32 rounded-full border-8 ${ringColor} flex items-center justify-center mb-4 shadow-sm bg-muted/50`}>
            <div className="text-center">
              <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
              <span className="block text-muted-foreground text-[10px]">/ 100</span>
            </div>
          </div>

          <h4 className={`text-xl font-bold mb-2 ${colorClass}`}>{recommendation}</h4>
          
          <div className="flex items-center gap-4 mt-2 w-full justify-center">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">Risk: <span className="text-foreground font-semibold">{riskLevel || 'Medium'}</span></span>
             </div>
          </div>
          
          <p className="text-muted-foreground text-center text-xs mt-4 px-2">
            Weighted analysis of ROI, Cash Flow, Market, and Risk factors.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealQualityScore;
