import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Trash2, Plus, CheckCircle2, Clock, AlertCircle, PauseCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_CONFIG = {
  'Not Started': { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/40 text-muted-foreground border-border' },
  'In Progress': { icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Complete':    { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'On Hold':     { icon: PauseCircle, color: 'text-amber-400', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

function formatCurrency(n) {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

const SOWStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Not Started'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

const RehabSOWCard = ({
  sow,
  tasks = [],
  estimate = null,
  materialsCount = 0,
  sowPhotos = [],
  materialsWithPhotos = [],
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskStatus,
  children,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [photoViewer, setPhotoViewer] = useState(null);  // { url, label } or null

  const progressThumbnails = sowPhotos.slice(0, 4).map((p) => ({ url: p.url, label: p.label || 'Progress' }));
  const materialThumbnails = materialsWithPhotos.map((m) => ({ url: m.product_photo_url, label: m.product_name || 'Material' }));

  const totalEstimated = estimate?.total_estimated ?? 0;
  const totalActual = estimate?.total_actual ?? 0;
  const variance = totalEstimated - totalActual;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <Card className="border-border overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-base">{sow.name}</h3>
            <SOWStatusBadge status={sow.status} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {sow.phase && <span>Phase: {sow.phase}</span>}
            {sow.area_of_work && <span>· {sow.area_of_work}</span>}
            {sow.start_date && <span>· Start: {sow.start_date}</span>}
            {sow.end_date && <span>· End: {sow.end_date}</span>}
          </div>
          {tasks.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}% ({completedTasks}/{tasks.length})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(sow); }}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="Edit scope"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(sow); }}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Delete scope"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Budget strip (2/3) + uploaded pics preview (1/3) */}
      <div className="flex border-t border-border">
        <div className="w-2/3 min-w-0">
          {estimate ? (
            <div className="grid grid-cols-3 text-center divide-x divide-border">
              <div className="py-2 px-3">
                <p className="text-xs text-muted-foreground">Budgeted</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(totalEstimated)}</p>
              </div>
              <div className="py-2 px-3">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(totalActual)}</p>
              </div>
              <div className="py-2 px-3">
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className={`text-sm font-semibold ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
        {progressThumbnails.length > 0 && (
          <div className="w-1/3 min-w-0 flex items-center justify-center gap-1 p-2 border-l border-border bg-muted/20">
            <div className="flex flex-wrap gap-1 justify-center">
              {progressThumbnails.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhotoViewer({ url: t.url, label: t.label }); }}
                  className="w-9 h-9 rounded overflow-hidden border border-border flex-shrink-0 hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img src={t.url} alt={t.label} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <CardContent className="p-0 border-t border-border">
          {/* Tasks */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Tasks</h4>
              <Button size="sm" onClick={() => onAddTask?.(sow)} className="h-7 gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-3 h-3" />
                Add Task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No tasks yet. Add tasks to track progress.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 group">
                    <label className="flex-shrink-0 cursor-pointer flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={task.status === 'Done'}
                        onChange={() => onToggleTaskStatus?.(task)}
                        className="sr-only"
                      />
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => onToggleTaskStatus?.(task)}
                        onKeyDown={(e) => e.key === 'Enter' && onToggleTaskStatus?.(task)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.status === 'Done'
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-border hover:border-green-500/50 hover:bg-green-500/10'
                        }`}
                      >
                        {task.status === 'Done' && <CheckCircle2 className="w-3 h-3" />}
                      </span>
                    </label>
                    <span className={`flex-1 text-sm cursor-pointer select-none ${task.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`} onClick={() => onToggleTaskStatus?.(task)}>
                      {task.title}
                    </span>
                    {task.assigned_to && (
                      <span className="text-xs text-muted-foreground hidden sm:block">{task.assigned_to}</span>
                    )}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={() => onEditTask?.(task)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => onDeleteTask?.(task)} className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Material logged pics — remain at their position */}
          {materialThumbnails.length > 0 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground mb-1.5">Material photos</p>
              <div className="flex flex-wrap gap-1.5">
                {materialThumbnails.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPhotoViewer({ url: t.url, label: t.label })}
                    className="w-10 h-10 rounded-lg overflow-hidden border border-border flex-shrink-0 hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img src={t.url} alt={t.label} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Materials count + child content */}
          {materialsCount > 0 && (
            <div className="px-4 pb-2">
              <span className="text-xs text-muted-foreground">{materialsCount} material{materialsCount !== 1 ? 's' : ''} logged</span>
            </div>
          )}

          {/* Slot for extra content (e.g. notes) */}
          {children && <div className="px-4 pb-4">{children}</div>}
        </CardContent>
      )}

      {/* Photo expand dialog */}
      {photoViewer && (
        <Dialog open={!!photoViewer} onOpenChange={() => setPhotoViewer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{photoViewer.label}</DialogTitle>
            </DialogHeader>
            <img
              src={photoViewer.url}
              alt={photoViewer.label}
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default RehabSOWCard;
