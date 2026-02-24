import React, { useState } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { issuesService } from '@/services/projectManagementService';

const STATUS_CONFIG = {
  Open:     { icon: AlertTriangle, bg: 'bg-red-500/20 text-red-400 border-red-500/30' },
  Pending:  { icon: Clock,         bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  Resolved: { icon: CheckCircle2,  bg: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const EMPTY_FORM = {
  description: '',
  impact: '',
  resolution: '',
  status: 'Open',
};

const IssueForm = ({ initial = EMPTY_FORM, onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Issue Description *</label>
        <textarea
          className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the problem (e.g. Rotted subfloor discovered in bathroom)"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Impact</label>
        <input
          className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={form.impact}
          onChange={(e) => set('impact', e.target.value)}
          placeholder="e.g. +$2,200 cost, +3 days delay"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Resolution</label>
        <textarea
          className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={2}
          value={form.resolution}
          onChange={(e) => set('resolution', e.target.value)}
          placeholder="How was this resolved?"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
        <select
          className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
        >
          {['Open', 'Pending', 'Resolved'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.description}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};

const RiskIssueLog = ({ dealId, issues = [], onIssuesChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setModalOpen(true); };
  const openEdit = (issue) => { setEditItem(issue); setModalOpen(true); };

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      if (editItem) {
        const updated = await issuesService.update(editItem.id, {
          description: form.description,
          impact: form.impact || null,
          resolution: form.resolution || null,
          status: form.status,
          resolved_at: form.status === 'Resolved' ? new Date().toISOString() : null,
        });
        onIssuesChange?.((issues || []).map((i) => i.id === editItem.id ? updated : i));
        toast({ title: 'Issue updated' });
      } else {
        const created = await issuesService.create(dealId, {
          description: form.description,
          impact: form.impact || null,
          resolution: form.resolution || null,
          status: form.status,
        });
        onIssuesChange?.([created, ...(issues || [])]);
        toast({ title: 'Issue logged' });
      }
      setModalOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (issue) => {
    if (!confirm('Delete this issue?')) return;
    try {
      await issuesService.delete(issue.id);
      onIssuesChange?.((issues || []).filter((i) => i.id !== issue.id));
      toast({ title: 'Deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const openCount = (issues || []).filter((i) => i.status === 'Open').length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Risk & Issue Log ({(issues || []).length})
            </h3>
            {openCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                {openCount} open
              </span>
            )}
          </div>
          <Button size="sm" onClick={openAdd} className="gap-2 bg-accentBrand hover:bg-accentBrand/90 text-white">
            <Plus className="w-4 h-4" />
            Log Issue
          </Button>
        </div>

        {!issues || issues.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No issues logged. Great news!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Track unexpected problems, cost overruns, or delays here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(issues || []).map((issue) => {
              const cfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.Open;
              const Icon = cfg.icon;
              return (
                <Card key={issue.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg border ${cfg.bg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {issue.description}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEdit(issue)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(issue)}
                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {issue.impact && (
                          <p className="text-xs text-amber-400 mt-1">
                            Impact: {issue.impact}
                          </p>
                        )}
                        {issue.resolution && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Resolution: {issue.resolution}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg}`}>
                            {issue.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(issue.reported_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Issue' : 'Log New Issue'}</DialogTitle>
          </DialogHeader>
          <IssueForm
            initial={editItem ? {
              description: editItem.description,
              impact: editItem.impact || '',
              resolution: editItem.resolution || '',
              status: editItem.status,
            } : EMPTY_FORM}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RiskIssueLog;
