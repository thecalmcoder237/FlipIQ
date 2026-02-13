import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { extractSOWTierBudgets, extractSOWTotalCost } from '@/utils/sowParser';

const TIER_LABELS = { budget: 'Budget Tier', midGrade: 'Mid-Grade Tier', highEnd: 'High-End Tier' };

const SOWBudgetComparison = ({ sowText, currentBudget, deal, onApplyRehabCost }) => {
  if (!sowText) return null;

  const tiers = extractSOWTierBudgets(sowText);
  const budget = Number(currentBudget) || 0;
  const hasAnyTier = tiers.budget != null || tiers.midGrade != null || tiers.highEnd != null;

  const TIER_COLORS = {
    budget: '#059669',
    midGrade: '#2563eb',
    highEnd: '#7c3aed',
  };
  const chartData = useMemo(() => {
    const items = [];
    if (budget > 0) items.push({ name: 'Your Budget', value: budget, fill: 'hsl(var(--primary))' });
    if (tiers.budget != null && tiers.budget > 0) items.push({ name: TIER_LABELS.budget, value: tiers.budget, fill: TIER_COLORS.budget });
    if (tiers.midGrade != null && tiers.midGrade > 0) items.push({ name: TIER_LABELS.midGrade, value: tiers.midGrade, fill: TIER_COLORS.midGrade });
    if (tiers.highEnd != null && tiers.highEnd > 0) items.push({ name: TIER_LABELS.highEnd, value: tiers.highEnd, fill: TIER_COLORS.highEnd });
    return items;
  }, [budget, tiers.budget, tiers.midGrade, tiers.highEnd]);

  // Closest tier to user budget
  const closestTier = useMemo(() => {
    if (budget <= 0 || !hasAnyTier) return null;
    const withDiff = [];
    if (tiers.budget != null) withDiff.push({ key: 'budget', label: TIER_LABELS.budget, value: tiers.budget, diff: Math.abs(tiers.budget - budget) });
    if (tiers.midGrade != null) withDiff.push({ key: 'midGrade', label: TIER_LABELS.midGrade, value: tiers.midGrade, diff: Math.abs(tiers.midGrade - budget) });
    if (tiers.highEnd != null) withDiff.push({ key: 'highEnd', label: TIER_LABELS.highEnd, value: tiers.highEnd, diff: Math.abs(tiers.highEnd - budget) });
    if (withDiff.length === 0) return null;
    withDiff.sort((a, b) => a.diff - b.diff);
    return withDiff[0];
  }, [budget, tiers]);

  const variance = closestTier ? closestTier.diff : null;
  const isOverBudget = closestTier != null && closestTier.value > budget;
  const percentDifference = closestTier != null && budget > 0 ? ((closestTier.value - budget) / budget * 100).toFixed(1) : null;

  if (!hasAnyTier) {
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
            No rehab tiers found in the SOW. Generate a SOW that includes finish tiers (Budget, Mid-Grade, High-End) to compare with your budget.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDollar = (n) => (n != null && n > 0 ? `$${Number(n).toLocaleString()}` : '—');

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center text-foreground">
          <DollarSign className="text-primary" />
          Your Budget vs Rehab Tiers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-muted/50">
                <TableHead className="text-muted-foreground font-medium">Your Budget</TableHead>
                <TableHead className="text-muted-foreground font-medium">Budget Tier</TableHead>
                <TableHead className="text-muted-foreground font-medium">Mid-Grade Tier</TableHead>
                <TableHead className="text-muted-foreground font-medium">High-End Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border">
                <TableCell className="font-medium text-foreground">{formatDollar(budget)}</TableCell>
                <TableCell className="text-foreground">{formatDollar(tiers.budget)}</TableCell>
                <TableCell className="text-foreground">{formatDollar(tiers.midGrade)}</TableCell>
                <TableCell className="text-foreground">{formatDollar(tiers.highEnd)}</TableCell>
              </TableRow>
              {onApplyRehabCost && (
                <TableRow className="border-border bg-muted/30">
                  <TableCell className="text-muted-foreground text-xs">Apply to Deal</TableCell>
                  <TableCell>
                    {tiers.budget != null && tiers.budget > 0 && (
                      <Button variant="outline" size="sm" onClick={() => onApplyRehabCost(tiers.budget)} className="text-xs">
                        Apply
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {tiers.midGrade != null && tiers.midGrade > 0 && (
                      <Button variant="outline" size="sm" onClick={() => onApplyRehabCost(tiers.midGrade)} className="text-xs">
                        Apply
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {tiers.highEnd != null && tiers.highEnd > 0 && (
                      <Button variant="outline" size="sm" onClick={() => onApplyRehabCost(tiers.highEnd)} className="text-xs">
                        Apply
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {chartData.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="text-primary" />
              Budget Comparison
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={95} stroke="hsl(var(--muted-foreground))" fontSize={12} tick={{ fill: 'hsl(var(--foreground))' }} />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={8}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {closestTier != null && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-card p-3 md:p-4 rounded-lg border border-border shadow-sm min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-foreground uppercase tracking-wide mb-1">Your Rehab Budget</p>
              <p className="text-lg md:text-2xl font-bold text-foreground break-all">${budget.toLocaleString()}</p>
            </div>
            <div className="bg-card p-3 md:p-4 rounded-lg border border-border shadow-sm min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-foreground uppercase tracking-wide mb-1">Closest Tier</p>
              <p className="text-sm md:text-2xl font-bold text-foreground break-words">{closestTier.label}: ${closestTier.value.toLocaleString()}</p>
            </div>
            <div className={`p-3 md:p-4 rounded-lg border min-w-0 ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {isOverBudget ? <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-red-600 shrink-0" /> : <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-green-600 shrink-0" />}
                <p className="text-[10px] md:text-xs font-medium text-foreground">Variance vs Closest Tier</p>
              </div>
              <p className={`text-lg md:text-2xl font-bold break-all ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {isOverBudget ? '+' : ''}${variance.toLocaleString()}
              </p>
              {percentDifference != null && (
                <p className={`text-[10px] md:text-xs mt-1 ${isOverBudget ? 'text-red-700' : 'text-green-700'}`}>
                  {isOverBudget ? `${percentDifference}% over budget` : `${Math.abs(percentDifference)}% under budget`}
                </p>
              )}
            </div>
          </div>
        )}

        {closestTier != null && (
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              {isOverBudget ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Budget Impact
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
                  Your budget is <strong className="text-red-600">${variance.toLocaleString()} below</strong> the closest tier ({closestTier.label}).
                </p>
                <ul className="list-disc list-inside text-foreground space-y-1 ml-2">
                  <li>Consider the Budget tier if targeting minimal finish</li>
                  <li>Review the SOW for items you could defer or phase</li>
                  <li>Get contractor quotes to validate tier estimates</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-foreground">
                  Your budget aligns with or exceeds the <strong className="text-green-600">{closestTier.label}</strong> estimate.
                </p>
                <ul className="list-disc list-inside text-foreground space-y-1 ml-2">
                  <li>Review the SOW line items for the tier that fits your plan</li>
                  <li>Consider allocating buffer to contingency or upgrades</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
          <h4 className="text-sm font-bold text-foreground mb-2">Recommendations</h4>
          <ul className="text-xs text-foreground space-y-1 list-disc list-inside mb-3">
            <li>Compare your budget to Budget, Mid-Grade, and High-End tiers above</li>
            <li>Get 2–3 contractor quotes to validate tier estimates</li>
            <li>Update your deal analysis with the tier that matches your plan</li>
          </ul>
          {onApplyRehabCost && (() => {
            const sowTotal = extractSOWTotalCost(sowText);
            if (sowTotal == null || sowTotal <= 0) return null;
            return (
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-foreground mb-2">Apply SOW total as rehab budget:</p>
                <Button variant="outline" size="sm" onClick={() => onApplyRehabCost(sowTotal)} className="text-xs">
                  Apply SOW Total (${sowTotal.toLocaleString()})
                </Button>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
};

export default SOWBudgetComparison;
