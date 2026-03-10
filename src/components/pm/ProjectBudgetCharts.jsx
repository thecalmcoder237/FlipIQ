import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

const COLORS = {
  budgeted: 'hsl(var(--primary))',
  actual: 'hsl(142, 76%, 36%)',  // green
  labor: '#3b82f6',
  materials: '#f59e0b',
  permits: '#8b5cf6',
};

const formatK = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`);

export const BudgetVsActualBarChart = ({ sowItems = [], estimates = {} }) => {
  const data = useMemo(() => {
    return sowItems
      .map((s) => {
        const e = estimates[s.id];
        const budgeted = e?.total_estimated ?? 0;
        const actual = e?.total_actual ?? 0;
        return {
          name: s.name?.slice(0, 20) || 'Scope',
          budgeted,
          actual,
          variance: budgeted - actual,
        };
      })
      .filter((d) => d.budgeted > 0 || d.actual > 0);
  }, [sowItems, estimates]);

  if (data.length === 0) return null;

  const tooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        <p className="text-muted-foreground">Budgeted: {formatK(payload[0]?.value ?? 0)}</p>
        <p className="text-muted-foreground">Actual: {formatK(payload[1]?.value ?? 0)}</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Budget vs Actual by Scope
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                angle={-35}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tickFormatter={(v) => formatK(v)}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={48}
              />
              <Tooltip content={tooltip} />
              <Bar dataKey="budgeted" name="Budgeted" fill={COLORS.budgeted} radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill={COLORS.actual} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const CostMixPieChart = ({ sowItems = [], estimates = {} }) => {
  const data = useMemo(() => {
    let labor = 0, materials = 0, permits = 0;
    sowItems.forEach((s) => {
      const e = estimates[s.id];
      labor += e?.labor_actual ?? 0;
      materials += e?.materials_actual ?? 0;
      permits += e?.permits_actual ?? 0;
    });
    return [
      { name: 'Labor', value: labor, color: COLORS.labor },
      { name: 'Materials', value: materials, color: COLORS.materials },
      { name: 'Permits', value: permits, color: COLORS.permits },
    ].filter((d) => d.value > 0);
  }, [sowItems, estimates]);

  if (data.length === 0) return null;

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const total = data.reduce((a, d) => a + d.value, 0);
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(0) : 0;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{p.name}</p>
        <p className="text-muted-foreground">${Number(p.value).toLocaleString()} ({pct}%)</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-primary" />
          Cost Mix (Actual)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="hsl(var(--border))" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={tooltip} />
              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
