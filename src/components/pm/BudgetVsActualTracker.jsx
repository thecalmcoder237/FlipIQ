import React from 'react';
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatCurrency(n) {
  if (!n && n !== 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function pct(actual, estimated) {
  if (!estimated) return 0;
  return Math.round((actual / estimated) * 100);
}

const CategoryRow = ({ label, estimated, actual }) => {
  const remaining = estimated - actual;
  const variance = remaining;
  const over = variance < 0;
  const spentPct = Math.min(pct(actual, estimated), 100);

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {over && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            Over budget
          </span>
        )}
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : spentPct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
          style={{ width: `${spentPct}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Budgeted</p>
          <p className="font-semibold text-foreground">{formatCurrency(estimated)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Spent</p>
          <p className="font-semibold text-foreground">{formatCurrency(actual)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Remaining</p>
          <p className={`font-semibold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(remaining)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Variance</p>
          <p className={`font-semibold ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
          </p>
        </div>
      </div>
    </div>
  );
};

const BudgetVsActualTracker = ({ sowItems = [], estimates = {} }) => {
  // estimates is a map: sowId → estimate row
  const totals = sowItems.reduce(
    (acc, sow) => {
      const est = estimates[sow.id];
      acc.estimated += est?.total_estimated ?? 0;
      acc.actual += est?.total_actual ?? 0;
      return acc;
    },
    { estimated: 0, actual: 0 }
  );

  const totalVariance = totals.estimated - totals.actual;
  const overallPct = Math.min(pct(totals.actual, totals.estimated), 100);

  if (sowItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Add scope items and estimates to track budget vs actual spend.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.estimated)}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.actual)}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className={`text-xl font-bold ${totalVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totalVariance)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">% Used</p>
              <p className={`text-xl font-bold ${overallPct > 90 ? 'text-red-400' : overallPct > 75 ? 'text-amber-400' : 'text-green-400'}`}>
                {overallPct}%
              </p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overallPct > 90 ? 'bg-red-500' : overallPct > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>{formatCurrency(totals.estimated)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-SOW breakdown */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">By Scope of Work</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {sowItems.map((sow) => {
            const est = estimates[sow.id];
            return (
              <CategoryRow
                key={sow.id}
                label={sow.name}
                estimated={est?.total_estimated ?? 0}
                actual={est?.total_actual ?? 0}
              />
            );
          })}
        </CardContent>
      </Card>

      {/* Labor / Materials / Permits detail */}
      {sowItems.some((s) => estimates[s.id]) && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {['labor', 'materials', 'permits'].map((cat) => {
              const estimated = sowItems.reduce((a, s) => a + (estimates[s.id]?.[`${cat}_estimate`] ?? 0), 0);
              const actual = sowItems.reduce((a, s) => a + (estimates[s.id]?.[`${cat}_actual`] ?? 0), 0);
              if (!estimated && !actual) return null;
              return (
                <CategoryRow
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  estimated={estimated}
                  actual={actual}
                />
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetVsActualTracker;
