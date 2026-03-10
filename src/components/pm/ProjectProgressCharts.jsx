import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

const STATUS_COLORS = {
  'Not Started': 'hsl(var(--muted-foreground))',
  'In Progress': 'hsl(var(--primary))',
  Done: 'hsl(142, 76%, 36%)',
};

export const TaskProgressChart = ({ tasks = [] }) => {
  const data = useMemo(() => {
    const counts = { 'Not Started': 0, 'In Progress': 0, Done: 0 };
    tasks.forEach((t) => {
      const s = t.status || 'Not Started';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return [
      { name: 'Not Started', value: counts['Not Started'], fill: STATUS_COLORS['Not Started'] },
      { name: 'In Progress', value: counts['In Progress'], fill: STATUS_COLORS['In Progress'] },
      { name: 'Done', value: counts['Done'], fill: STATUS_COLORS['Done'] },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  if (tasks.length === 0) return null;

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const total = tasks.length;
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(0) : 0;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{p.payload.name}</p>
        <p className="text-muted-foreground">{p.value} tasks ({pct}%)</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Task Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={28} />
              <Tooltip content={tooltip} />
              <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const VarianceBarChart = ({ sowItems = [], estimates = {} }) => {
  const data = useMemo(() => {
    return sowItems.map((s) => {
      const e = estimates[s.id];
      const budgeted = e?.total_estimated ?? 0;
      const actual = e?.total_actual ?? 0;
      const variance = budgeted - actual;
      return {
        name: (s.name || 'Scope').slice(0, 18),
        variance,
        fill: variance >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)',
      };
    });
  }, [sowItems, estimates]);

  if (data.length === 0) return null;

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0]?.value ?? 0;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{payload[0]?.payload?.name}</p>
        <p className={v >= 0 ? 'text-green-600' : 'text-red-600'}>
          {v >= 0 ? '+' : ''}${Number(v).toLocaleString()}
        </p>
        <p className="text-muted-foreground text-xs">{v >= 0 ? 'Under budget' : 'Over budget'}</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Variance by Scope
        </CardTitle>
        <p className="text-xs text-muted-foreground">Positive = under budget, negative = over</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 72, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
              <XAxis
                type="number"
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
              <Tooltip content={tooltip} />
              <Bar dataKey="variance" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
