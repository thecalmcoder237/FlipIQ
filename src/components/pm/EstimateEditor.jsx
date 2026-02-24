import React, { useState, useEffect } from 'react';
import { DollarSign, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { estimatesService } from '@/services/projectManagementService';

const NumInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        className="w-full bg-muted border border-input rounded-lg pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  </div>
);

const CheckRow = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="rounded border-border text-primary"
    />
    {label}
  </label>
);

const EstimateEditor = ({ sow, estimate, open, onClose, onSaved }) => {
  const [form, setForm] = useState({
    labor_estimate: 0,
    labor_actual: 0,
    labor_paid: false,
    materials_estimate: 0,
    permits_estimate: 0,
    permits_actual: 0,
    permits_paid: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (estimate) {
      setForm({
        labor_estimate: estimate.labor_estimate ?? 0,
        labor_actual: estimate.labor_actual ?? 0,
        labor_paid: estimate.labor_paid ?? false,
        materials_estimate: estimate.materials_estimate ?? 0,
        permits_estimate: estimate.permits_estimate ?? 0,
        permits_actual: estimate.permits_actual ?? 0,
        permits_paid: estimate.permits_paid ?? false,
        notes: estimate.notes ?? '',
      });
    }
  }, [estimate]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        labor_estimate: parseFloat(form.labor_estimate) || 0,
        labor_actual: parseFloat(form.labor_actual) || 0,
        labor_paid: form.labor_paid,
        materials_estimate: parseFloat(form.materials_estimate) || 0,
        permits_estimate: parseFloat(form.permits_estimate) || 0,
        permits_actual: parseFloat(form.permits_actual) || 0,
        permits_paid: form.permits_paid,
        notes: form.notes || null,
      };
      const saved = await estimatesService.upsertForSow(sow.id, payload);
      onSaved?.(saved);
      toast({ title: 'Estimates saved' });
      onClose();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Estimates — {sow?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Labor */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Labor</p>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Labor Estimate" value={form.labor_estimate} onChange={(v) => set('labor_estimate', v)} />
              <NumInput label="Labor Actual" value={form.labor_actual} onChange={(v) => set('labor_actual', v)} />
            </div>
            <div className="mt-2">
              <CheckRow label="Labor Paid" checked={form.labor_paid} onChange={(v) => set('labor_paid', v)} />
            </div>
          </div>

          {/* Materials (estimate only; actual auto-computed from materials_log) */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Materials</p>
            <p className="text-xs text-muted-foreground mb-2">
              Materials actual is auto-calculated from your Materials Log entries.
            </p>
            <NumInput label="Materials Estimate" value={form.materials_estimate} onChange={(v) => set('materials_estimate', v)} />
          </div>

          {/* Permits */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Permits</p>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Permits Estimate" value={form.permits_estimate} onChange={(v) => set('permits_estimate', v)} />
              <NumInput label="Permits Actual" value={form.permits_actual} onChange={(v) => set('permits_actual', v)} />
            </div>
            <div className="mt-2">
              <CheckRow label="Permits Paid" checked={form.permits_paid} onChange={(v) => set('permits_paid', v)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Variance Notes</label>
            <textarea
              className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Explain any variances from budget…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Estimates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EstimateEditor;
