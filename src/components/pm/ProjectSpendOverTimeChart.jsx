import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const formatK = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`);

export const ProjectSpendOverTimeChart = ({ transactions = [], materials = [] }) => {
  const { series, totalSpent } = useMemo(() => {
    const byDate = {};
    transactions.forEach((t) => {
      const d = t.transaction_date || t.created_at?.slice(0, 10);
      if (!d) return;
      if (!byDate[d]) byDate[d] = { date: d, labor: 0, permits: 0, materials: 0, total: 0 };
      const amt = Number(t.amount) || 0;
      byDate[d].total += amt;
      if (t.estimate_type === 'labor') byDate[d].labor += amt;
      else if (t.estimate_type === 'permits') byDate[d].permits += amt;
    });
    materials.forEach((m) => {
      const d = m.expense_date || m.created_at?.slice(0, 10);
      if (!d) return;
      if (!byDate[d]) byDate[d] = { date: d, labor: 0, permits: 0, materials: 0, total: 0 };
      const amt = Number(m.total_amount) || 0;
      byDate[d].materials += amt;
      byDate[d].total += amt;
    });
    const sorted = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    const withCum = sorted.map((row) => {
      cum += row.total;
      return { ...row, cumulative: cum };
    });
    return { series: withCum, totalSpent: cum };
  }, [transactions, materials]);

  if (series.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Spend Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground py-8 text-center">
            Add transactions and materials to see cumulative spend over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{p?.date}</p>
        <p className="text-muted-foreground">Cumulative: {formatK(p?.cumulative ?? 0)}</p>
        <p className="text-muted-foreground text-xs">That day: {formatK(p?.total ?? 0)}</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Spend Over Time
        </CardTitle>
        <p className="text-xs text-muted-foreground">Cumulative actual spend</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')}
              />
              <YAxis
                tickFormatter={(v) => formatK(v)}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={48}
              />
              <Tooltip content={tooltip} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
