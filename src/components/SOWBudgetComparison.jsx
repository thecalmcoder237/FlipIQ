import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { extractSOWTotalCost } from '@/utils/sowParser';

const SOWBudgetComparison = ({ sowText, currentBudget, deal }) => {
  if (!sowText) return null;

  const sowEstimate = extractSOWTotalCost(sowText);
  const budget = Number(currentBudget) || 0;

  if (!sowEstimate || sowEstimate === 0) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-foreground">
            <AlertTriangle className="text-yellow-600" />
            Budget Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground text-sm">
            Could not extract estimated cost from SOW. Please review the SOW document for cost details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const difference = sowEstimate - budget;
  const percentDifference = budget > 0 ? ((difference / budget) * 100).toFixed(1) : 0;
  const isOverBudget = difference > 0;
  const variance = Math.abs(difference);

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center text-foreground">
          <DollarSign className="text-primary" />
          SOW Estimate vs Current Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide mb-1">Current Rehab Budget</p>
            <p className="text-2xl font-bold text-foreground">${budget.toLocaleString()}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide mb-1">SOW Visual Analysis Estimate</p>
            <p className="text-2xl font-bold text-foreground">${sowEstimate.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-lg border ${
            isOverBudget 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {isOverBudget ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
              <p className="text-xs font-medium text-foreground">Variance</p>
            </div>
            <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {isOverBudget ? '+' : ''}${variance.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isOverBudget ? 'text-red-700' : 'text-green-700'}`}>
              {isOverBudget ? `${percentDifference}% over budget` : `${Math.abs(percentDifference)}% under budget`}
            </p>
          </div>
        </div>

        {/* Impact Analysis */}
        <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            {isOverBudget ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Budget Impact Analysis
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Budget Status
              </>
            )}
          </h4>
          
          {isOverBudget ? (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                The visual analysis indicates <strong className="text-red-600">${variance.toLocaleString()} more</strong> in rehab costs than your current budget.
              </p>
              <ul className="list-disc list-inside text-foreground space-y-1 ml-2">
                <li>Consider increasing your rehab budget to ${sowEstimate.toLocaleString()}</li>
                <li>Review the SOW for items that could be deferred or done in phases</li>
                <li>Get contractor quotes to validate the visual analysis estimates</li>
                <li>Factor in a contingency buffer for unexpected issues</li>
              </ul>
              {deal && deal.arv && (
                <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-xs font-medium text-foreground mb-1">Impact on Deal Metrics</p>
                  <p className="text-sm text-foreground">
                    Updated Total Project Cost: <strong>${(Number(deal.purchase_price || 0) + sowEstimate).toLocaleString()}</strong>
                  </p>
                  <p className="text-xs text-foreground mt-1">
                    This may affect your ROI and deal score calculations.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                The visual analysis indicates your current budget has <strong className="text-green-600">${variance.toLocaleString()} buffer</strong> beyond the estimated work needed.
              </p>
              <ul className="list-disc list-inside text-foreground space-y-1 ml-2">
                <li>Your budget appears adequate for the visible work identified</li>
                <li>Consider allocating the buffer to contingency or upgrades</li>
                <li>Remember: Hidden issues may require additional funds</li>
                <li>Always get professional inspections before finalizing budget</li>
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
          <h4 className="text-sm font-bold text-foreground mb-2">Recommendations</h4>
          <ul className="text-xs text-foreground space-y-1 list-disc list-inside">
            <li>Review the detailed SOW line items for specific cost breakdowns</li>
            <li>Get 2-3 contractor quotes to validate the visual analysis estimates</li>
            <li>Schedule professional inspections for items marked "Inspection Required"</li>
            <li>Update your deal analysis with the SOW estimate to see impact on ROI</li>
            {isOverBudget && (
              <li className="text-red-700">Consider adjusting your purchase price or ARV expectations</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SOWBudgetComparison;
