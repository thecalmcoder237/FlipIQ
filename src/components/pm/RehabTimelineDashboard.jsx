import React, { useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, PauseCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_CONFIG = {
  'Not Started': { icon: Clock,        bar: 'bg-muted',          text: 'text-muted-foreground',  label: 'Not Started' },
  'In Progress': { icon: AlertCircle,  bar: 'bg-blue-500',       text: 'text-blue-400',           label: 'In Progress' },
  'Complete':    { icon: CheckCircle2, bar: 'bg-green-500',      text: 'text-green-400',          label: 'Complete' },
  'On Hold':     { icon: PauseCircle,  bar: 'bg-amber-500',      text: 'text-amber-400',          label: 'On Hold' },
};

function daysBetween(a, b) {
  const msPerDay = 86400000;
  return Math.round((new Date(b) - new Date(a)) / msPerDay);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TimelineRow = ({ sow, minDate, totalDays }) => {
  const cfg = STATUS_CONFIG[sow.status] || STATUS_CONFIG['Not Started'];
  const Icon = cfg.icon;

  const startOffset = sow.start_date
    ? Math.max(0, daysBetween(minDate, sow.start_date))
    : 0;
  const duration = sow.start_date && sow.end_date
    ? Math.max(1, daysBetween(sow.start_date, sow.end_date))
    : (sow.duration_days || 7);

  const leftPct = totalDays > 0 ? (startOffset / totalDays) * 100 : 0;
  const widthPct = totalDays > 0 ? Math.min((duration / totalDays) * 100, 100 - leftPct) : 20;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      {/* Label */}
      <div className="w-36 sm:w-48 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.text}`} />
          <span className="text-xs font-medium text-foreground truncate">{sow.name}</span>
        </div>
        {sow.area_of_work && (
          <p className="text-xs text-muted-foreground truncate ml-5">{sow.area_of_work}</p>
        )}
      </div>

      {/* Bar */}
      <div className="flex-1 relative h-6 bg-muted/30 rounded-md overflow-hidden">
        <div
          className={`absolute top-1 bottom-1 rounded ${cfg.bar} opacity-80 flex items-center justify-end pr-1`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          {duration >= 5 && (
            <span className="text-xs text-white/90 font-medium truncate px-1">
              {duration}d
            </span>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="w-24 flex-shrink-0 text-right hidden sm:block">
        {sow.start_date ? (
          <p className="text-xs text-muted-foreground leading-none">{sow.start_date}</p>
        ) : null}
        {sow.end_date ? (
          <p className="text-xs text-muted-foreground leading-none mt-0.5">{sow.end_date}</p>
        ) : null}
      </div>
    </div>
  );
};

const RehabTimelineDashboard = ({ sowItems = [] }) => {
  const { minDate, maxDate, totalDays, itemsWithDates } = useMemo(() => {
    const withDates = sowItems.filter((s) => s.start_date);
    const withoutDates = sowItems.filter((s) => !s.start_date);

    let min = withDates.length > 0
      ? withDates.reduce((m, s) => (s.start_date < m ? s.start_date : m), withDates[0].start_date)
      : new Date().toISOString().slice(0, 10);

    let max = withDates.length > 0
      ? withDates.reduce((m, s) => {
          const end = s.end_date || addDays(s.start_date, s.duration_days || 7);
          return end > m ? end : m;
        }, withDates[0].start_date)
      : addDays(min, 30);

    const total = Math.max(daysBetween(min, max), 7);

    // For items without dates, space them evenly across the timeline
    let cursor = min;
    const positioned = sowItems.map((s) => {
      if (s.start_date) return s;
      const dur = s.duration_days || 7;
      const out = { ...s, start_date: cursor, end_date: addDays(cursor, dur) };
      cursor = addDays(cursor, Math.ceil(dur * 1.1));
      return out;
    });

    return { minDate: min, maxDate: max, totalDays: total, itemsWithDates: positioned };
  }, [sowItems]);

  if (sowItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Add scope items with start/end dates to see the project timeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Rehab Timeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {minDate} → {maxDate} · {totalDays} day span
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(STATUS_CONFIG).map(([key, v]) => {
              const Icon = v.icon;
              return (
                <span key={key} className={`flex items-center gap-1 text-xs ${v.text}`}>
                  <Icon className="w-3 h-3" />
                  {v.label}
                </span>
              );
            })}
          </div>

          {/* Header row */}
          <div className="flex items-center gap-3 pb-1 border-b border-border mb-1">
            <div className="w-36 sm:w-48 flex-shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Scope Item</span>
            </div>
            <div className="flex-1">
              <span className="text-xs font-medium text-muted-foreground">Timeline</span>
            </div>
            <div className="w-24 flex-shrink-0 text-right hidden sm:block">
              <span className="text-xs font-medium text-muted-foreground">Dates</span>
            </div>
          </div>

          {itemsWithDates.map((sow) => (
            <TimelineRow
              key={sow.id}
              sow={sow}
              minDate={minDate}
              totalDays={totalDays}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RehabTimelineDashboard;
