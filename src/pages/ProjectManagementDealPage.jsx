import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Hammer,
  Calendar,
  DollarSign,
  Camera,
  AlertTriangle,
  ClipboardList,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  BarChart3,
  Package,
  Save,
  FileDown,
  Search,
  Filter,
  LayoutGrid,
  List,
  LayoutList,
  Download,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { dealService } from '@/services/dealService';
import {
  phasesService,
  sowService,
  tasksService,
  estimatesService,
  photosService,
  issuesService,
  materialsService,
} from '@/services/projectManagementService';
import Breadcrumb from '@/components/Breadcrumb';
import RehabTimelineDashboard from '@/components/pm/RehabTimelineDashboard';
import BudgetVsActualTracker from '@/components/pm/BudgetVsActualTracker';
import MaterialsLog from '@/components/pm/MaterialsLog';
import PhotoJournal from '@/components/pm/PhotoJournal';
import RiskIssueLog from '@/components/pm/RiskIssueLog';
import RehabSOWCard from '@/components/pm/RehabSOWCard';
import EstimateEditor from '@/components/pm/EstimateEditor';
import { parseSOWLineItems } from '@/utils/sowParser';

const ACTIVE_REHAB_STATUSES = ['Funded', 'Closed', 'Completed'];

function isActiveRehab(deal) {
  return ACTIVE_REHAB_STATUSES.includes(deal?.status) || deal?.isFunded || deal?.isClosed;
}

// ─── SOW Form ────────────────────────────────────────────────────────────────
const EMPTY_SOW = { name: '', category: '', area_of_work: '', phase: '', objectives: '', duration_days: '', start_date: '', end_date: '', status: 'Not Started', notes: '' };
const SOW_STATUSES = ['Not Started', 'In Progress', 'Complete', 'On Hold'];

const SOWForm = ({ initial = EMPTY_SOW, phases = [], onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({ ...EMPTY_SOW, ...initial });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Scope Name *</label>
          <input className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder='e.g. "Kitchen Remodel"' />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
          <input className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Interior, Exterior, Systems…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Area of Work</label>
          <input className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.area_of_work} onChange={(e) => set('area_of_work', e.target.value)} placeholder="Kitchen, Master Bath…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Phase</label>
          <select className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.phase} onChange={(e) => set('phase', e.target.value)}>
            <option value="">— Select phase —</option>
            {phases.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {SOW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
          <input type="date" className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
          <input type="date" className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (days)</label>
          <input type="number" min="1" className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.duration_days} onChange={(e) => set('duration_days', e.target.value)} placeholder="7" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Objectives / Notes</label>
          <textarea className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.name}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};

// ─── Task Form ────────────────────────────────────────────────────────────────
const EMPTY_TASK = { title: '', status: 'Not Started', assigned_to: '', planned_start: '', planned_end: '', notes: '' };

const TaskForm = ({ initial = EMPTY_TASK, phases = [], onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({ ...EMPTY_TASK, ...initial });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Task Title *</label>
        <input className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder='e.g. "Install plumbing rough-in"' />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['Not Started', 'In Progress', 'Done'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Assigned To</label>
          <input className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} placeholder="GC, Subcontractor…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Planned Start</label>
          <input type="date" className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.planned_start} onChange={(e) => set('planned_start', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Planned End</label>
          <input type="date" className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={form.planned_end} onChange={(e) => set('planned_end', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
        <textarea className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.title}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProjectManagementDealPage = () => {
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('id');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Data state
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phases, setPhases] = useState([]);
  const [sowItems, setSowItems] = useState([]);
  const [tasks, setTasks] = useState([]);         // all tasks for deal
  const [estimates, setEstimates] = useState({}); // sowId → estimate
  const [photos, setPhotos] = useState([]);
  const [issues, setIssues] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);  // materials for deal (for photo previews)

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [scopeSearch, setScopeSearch] = useState('');
  const [scopeFilterCategory, setScopeFilterCategory] = useState('all');
  const [scopeFilterPhase, setScopeFilterPhase] = useState('all');
  const [scopeFilterArea, setScopeFilterArea] = useState('all');
  const [scopeViewMode, setScopeViewMode] = useState('cards');  // 'cards' | 'list' | 'portfolio'
  const [sowModal, setSowModal] = useState(false);
  const [editSow, setEditSow] = useState(null);
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskTargetSow, setTaskTargetSow] = useState(null);
  const [estimateModal, setEstimateModal] = useState(false);
  const [estimateSow, setEstimateSow] = useState(null);
  const [savingSOW, setSavingSOW] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [importingSOW, setImportingSOW] = useState(false);

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!dealId || !currentUser) return;
    setLoading(true);
    try {
      const [dealData, phasesData, sowData, tasksData, photosData, issuesData, materialsData] = await Promise.all([
        dealService.loadDeal(dealId, currentUser.id),
        phasesService.getAll(),
        sowService.getForDeal(dealId),
        tasksService.getForDeal(dealId),
        photosService.getForDeal(dealId),
        issuesService.getForDeal(dealId),
        materialsService.getForDeal(dealId).catch(() => []),
      ]);

      if (!dealData) { navigate('/project-management'); return; }
      if (!isActiveRehab(dealData)) { navigate('/project-management'); return; }

      setDeal(dealData);
      setPhases(phasesData);
      setSowItems(sowData);
      setTasks(tasksData);
      setPhotos(photosData);
      setIssues(issuesData);
      setAllMaterials(Array.isArray(materialsData) ? materialsData : []);

      // Load estimates for each SOW item
      const estimateMap = {};
      await Promise.all(sowData.map(async (sow) => {
        const est = await estimatesService.getForSow(sow.id);
        if (est) estimateMap[sow.id] = est;
      }));
      setEstimates(estimateMap);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error loading project', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [dealId, currentUser]);

  useEffect(() => {
    if (!dealId) { navigate('/project-management'); return; }
    loadAll();
  }, [dealId, currentUser]);

  // ── SOW CRUD ───────────────────────────────────────────────────────────────
  const handleSOWSave = async (form) => {
    setSavingSOW(true);
    try {
      const payload = {
        name: form.name,
        category: form.category || null,
        area_of_work: form.area_of_work || null,
        phase: form.phase || null,
        objectives: form.objectives || null,
        duration_days: parseInt(form.duration_days) || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editSow) {
        const updated = await sowService.update(editSow.id, payload);
        setSowItems((p) => p.map((s) => s.id === editSow.id ? updated : s));
        toast({ title: 'Scope updated' });
      } else {
        const created = await sowService.create(dealId, payload);
        setSowItems((p) => [...p, created]);
        // Auto-fetch the new estimate row
        const est = await estimatesService.getForSow(created.id);
        if (est) setEstimates((p) => ({ ...p, [created.id]: est }));
        toast({ title: 'Scope item added' });
      }
      setSowModal(false);
      setEditSow(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSavingSOW(false);
    }
  };

  // ── Import SOW from Rehab Insights (Deal Analysis) ────────────────────────
  const handleImportFromRehabInsights = async () => {
    const rehabSowText = deal?.rehabSow || deal?.rehab_sow || '';
    if (!rehabSowText || !rehabSowText.trim()) {
      toast({
        variant: 'destructive',
        title: 'No SOW to import',
        description: 'Generate a SOW in Deal Analysis first (Rehab Plan tab → Generate SOW & Budget).',
      });
      return;
    }
    setImportingSOW(true);
    try {
      const { lineItems } = parseSOWLineItems(rehabSowText);
      if (!lineItems || lineItems.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No scope items found',
          description: 'The Rehab Insights SOW has no parseable line items. Try regenerating it in Deal Analysis.',
        });
        return;
      }
      const firstPhase = phases[0]?.name || null;
      for (let i = 0; i < lineItems.length; i++) {
        const { category, item, cost } = lineItems[i];
        const notes = cost > 0 ? `Est. $${cost.toLocaleString()}` : null;
        await sowService.create(dealId, {
          name: item || 'Scope item',
          category: category || 'General',
          area_of_work: category || null,
          phase: firstPhase,
          status: 'Not Started',
          notes,
        });
      }
      toast({ title: 'Import complete', description: `Added ${lineItems.length} scope item${lineItems.length === 1 ? '' : 's'} from Rehab Insights.` });
      await loadAll();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Import failed', description: e.message });
    } finally {
      setImportingSOW(false);
    }
  };

  const handleSOWDelete = async (sow) => {
    if (!confirm(`Delete "${sow.name}" and all its tasks, materials, and estimates?`)) return;
    try {
      await sowService.delete(sow.id);
      setSowItems((p) => p.filter((s) => s.id !== sow.id));
      setTasks((p) => p.filter((t) => t.sow_id !== sow.id));
      setEstimates((p) => { const n = { ...p }; delete n[sow.id]; return n; });
      toast({ title: 'Deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  const handleTaskSave = async (form) => {
    setSavingTask(true);
    try {
      const phaseObj = phases.find((p) => p.name === form.phase);
      const payload = {
        title: form.title,
        status: form.status,
        assigned_to: form.assigned_to || null,
        planned_start: form.planned_start || null,
        planned_end: form.planned_end || null,
        notes: form.notes || null,
        sow_id: taskTargetSow?.id || null,
        phase_id: phaseObj?.id || null,
        order_index: tasks.filter((t) => t.sow_id === taskTargetSow?.id).length,
      };
      if (editTask) {
        const updated = await tasksService.update(editTask.id, payload);
        setTasks((p) => p.map((t) => t.id === editTask.id ? updated : t));
        toast({ title: 'Task updated' });
      } else {
        const created = await tasksService.create(dealId, payload);
        setTasks((p) => [...p, created]);
        toast({ title: 'Task added' });
      }
      setTaskModal(false);
      setEditTask(null);
      setTaskTargetSow(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSavingTask(false);
    }
  };

  const handleTaskDelete = async (task) => {
    try {
      await tasksService.delete(task.id);
      setTasks((p) => p.filter((t) => t.id !== task.id));
      toast({ title: 'Task deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'Done' ? 'Not Started' : task.status === 'In Progress' ? 'Done' : 'In Progress';
    try {
      const updated = await tasksService.update(task.id, { status: nextStatus });
      setTasks((p) => p.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error updating task', description: e.message });
    }
  };

  // ── Estimate update callback ───────────────────────────────────────────────
  const handleEstimateSaved = (est) => {
    setEstimates((p) => ({ ...p, [est.sow_id]: est }));
  };

  // ── Filtered scopes (search + filter) ──────────────────────────────────────
  const filteredSowItems = useMemo(() => {
    let list = sowItems;
    const q = (scopeSearch || '').toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.area_of_work || '').toLowerCase().includes(q) ||
        (s.phase || '').toLowerCase().includes(q)
      );
    }
    if (scopeFilterCategory !== 'all') {
      list = list.filter((s) => (s.category || '') === scopeFilterCategory);
    }
    if (scopeFilterPhase !== 'all') {
      list = list.filter((s) => (s.phase || '') === scopeFilterPhase);
    }
    if (scopeFilterArea !== 'all') {
      list = list.filter((s) => (s.area_of_work || '') === scopeFilterArea);
    }
    return list;
  }, [sowItems, scopeSearch, scopeFilterCategory, scopeFilterPhase, scopeFilterArea]);

  const uniqueCategories = useMemo(() => [...new Set(sowItems.map((s) => s.category).filter(Boolean))].sort(), [sowItems]);
  const uniquePhases = useMemo(() => [...new Set(sowItems.map((s) => s.phase).filter(Boolean))].sort(), [sowItems]);
  const uniqueAreas = useMemo(() => [...new Set(sowItems.map((s) => s.area_of_work).filter(Boolean))].sort(), [sowItems]);

  // ── Export scopes ──────────────────────────────────────────────────────────
  const handleExportScopes = () => {
    const headers = ['Name', 'Category', 'Area of Work', 'Phase', 'Status', 'Start Date', 'End Date', 'Duration (days)', 'Notes'];
    const rows = sowItems.map((s) => [
      s.name || '',
      s.category || '',
      s.area_of_work || '',
      s.phase || '',
      s.status || '',
      s.start_date || '',
      s.end_date || '',
      s.duration_days ?? '',
      s.notes || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scopes-${deal?.address?.replace(/\s+/g, '-') || 'project'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Scopes exported' });
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'Done').length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalBudget = Object.values(estimates).reduce((a, e) => a + (e?.total_estimated ?? 0), 0);
  const totalSpent = Object.values(estimates).reduce((a, e) => a + (e?.total_actual ?? 0), 0);
  const openIssues = issues.filter((i) => i.status === 'Open').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deal) return null;

  return (
    <>
      <Helmet>
        <title>{deal.address || 'Project'} — Rehab Management · FlipIQ</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
          <Breadcrumb />

          {/* Back + Header */}
          <div className="flex items-start justify-between mt-4 mb-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/project-management')}
                className="gap-1 text-muted-foreground hover:text-foreground mb-2 -ml-2"
              >
                <ArrowLeft className="w-4 h-4" />
                All Projects
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accentBrand/10 rounded-xl">
                  <Hammer className="w-5 h-5 text-accentBrand" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {deal.address || 'Rehab Project'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {[deal.city, deal.county].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/deal-analysis?id=${dealId}`)}
              className="hidden sm:flex gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <BarChart3 className="w-4 h-4" />
              View Analysis
            </Button>
          </div>

          {/* Summary KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card className="p-4 shadow-sm border-border/80 transition-shadow hover:shadow-md">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Progress
              </p>
              <p className="text-2xl font-bold text-foreground">{overallProgress}%</p>
              <p className="text-xs text-muted-foreground">{doneTasks}/{totalTasks} tasks done</p>
            </Card>
            <Card className="p-4 shadow-sm border-border/80">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Budget
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalBudget >= 1000 ? `$${Math.round(totalBudget / 1000)}K` : `$${Math.round(totalBudget)}`}
              </p>
              <p className="text-xs text-muted-foreground">{totalBudget > 0 ? `$${Math.round(totalSpent / 1000)}K spent` : 'Not set'}</p>
            </Card>
            <Card className="p-4 shadow-sm border-border/80">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Camera className="w-3 h-3" /> Photos
              </p>
              <p className="text-2xl font-bold text-foreground">{photos.length}</p>
              <p className="text-xs text-muted-foreground">Progress photos</p>
            </Card>
            <Card className={`p-4 shadow-sm border-border/80 ${openIssues > 0 ? 'border-red-500/30' : ''}`}>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Issues
              </p>
              <p className={`text-2xl font-bold ${openIssues > 0 ? 'text-red-400' : 'text-foreground'}`}>
                {openIssues}
              </p>
              <p className="text-xs text-muted-foreground">{issues.length} total</p>
            </Card>
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div className="mb-6">
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accentBrand transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overall rehab progress: {overallProgress}%</p>
            </div>
          )}

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap gap-1 h-auto p-2 mb-6 bg-primary rounded-xl">
              {[
                { value: 'overview', label: 'Scope & Tasks', icon: ClipboardList },
                { value: 'timeline', label: 'Timeline', icon: Calendar },
                { value: 'budget', label: 'Budget', icon: DollarSign },
                { value: 'materials', label: 'Materials', icon: Package },
                { value: 'photos', label: 'Photos', icon: Camera },
                { value: 'issues', label: 'Issues', icon: AlertTriangle },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 text-primary-foreground/80 hover:text-primary-foreground data-[state=active]:bg-background data-[state=active]:text-accentBrand data-[state=active]:font-semibold data-[state=active]:shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {value === 'issues' && openIssues > 0 && (
                    <span className="ml-0.5 w-4 h-4 text-xs rounded-full bg-red-500 text-white flex items-center justify-center">
                      {openIssues}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Scope & Tasks Tab ─────────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-foreground">Scope of Work</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs bg-muted/50 hover:bg-muted border-border text-foreground"
                    onClick={handleImportFromRehabInsights}
                    disabled={importingSOW || !(deal?.rehabSow || deal?.rehab_sow)?.trim()}
                    title={!(deal?.rehabSow || deal?.rehab_sow)?.trim() ? 'Generate a SOW in Deal Analysis first' : 'Import scope items from Rehab Insights'}
                  >
                    {importingSOW ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                    Import from Rehab Insights
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => { setEditSow(null); setSowModal(true); }}
                  >
                    <Plus className="w-3 h-3" />
                    Add Scope
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={handleExportScopes}
                    disabled={sowItems.length === 0}
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </div>
              </div>

              {sowItems.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search scopes…"
                      value={scopeSearch}
                      onChange={(e) => setScopeSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Select value={scopeFilterCategory} onValueChange={setScopeFilterCategory}>
                    <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {uniqueCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={scopeFilterPhase} onValueChange={setScopeFilterPhase}>
                    <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Phase" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All phases</SelectItem>
                      {uniquePhases.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={scopeFilterArea} onValueChange={setScopeFilterArea}>
                    <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All areas</SelectItem>
                      {uniqueAreas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-input overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setScopeViewMode('cards')}
                      className={`p-2 ${scopeViewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      title="Card view"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeViewMode('list')}
                      className={`p-2 ${scopeViewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      title="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeViewMode('portfolio')}
                      className={`p-2 ${scopeViewMode === 'portfolio' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      title="Compact cards"
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {sowItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No scope items yet.</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Add scope items manually or import from Rehab Insights (Deal Analysis).
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        onClick={handleImportFromRehabInsights}
                        disabled={importingSOW || !(deal?.rehabSow || deal?.rehab_sow)?.trim()}
                        variant="outline"
                        className="gap-2 bg-muted/50 hover:bg-muted border-border text-foreground"
                        title={!(deal?.rehabSow || deal?.rehab_sow)?.trim() ? 'Generate a SOW in Deal Analysis first' : undefined}
                      >
                        {importingSOW ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Import from Rehab Insights
                      </Button>
                      <Button onClick={() => { setEditSow(null); setSowModal(true); }} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="w-4 h-4" />
                        Add Manually
                      </Button>
                    </div>
                    {!(deal?.rehabSow || deal?.rehab_sow)?.trim() && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Generate a SOW in Deal Analysis → Rehab Plan to enable import.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : filteredSowItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Filter className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No scopes match your search or filters.</p>
                  </CardContent>
                </Card>
              ) : scopeViewMode === 'list' ? (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium">Scope</th>
                          <th className="text-left py-3 px-4 font-medium">Category</th>
                          <th className="text-left py-3 px-4 font-medium">Phase</th>
                          <th className="text-left py-3 px-4 font-medium">Area</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Progress</th>
                          <th className="text-right py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSowItems.map((sow) => {
                          const sowTasks = tasks.filter((t) => t.sow_id === sow.id);
                          const doneCount = sowTasks.filter((t) => t.status === 'Done').length;
                          const prog = sowTasks.length > 0 ? Math.round((doneCount / sowTasks.length) * 100) : 0;
                          return (
                            <tr key={sow.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-3 px-4 font-medium">{sow.name}</td>
                              <td className="py-3 px-4 text-muted-foreground">{sow.category || '—'}</td>
                              <td className="py-3 px-4 text-muted-foreground">{sow.phase || '—'}</td>
                              <td className="py-3 px-4 text-muted-foreground">{sow.area_of_work || '—'}</td>
                              <td className="py-3 px-4">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${sow.status === 'Complete' ? 'bg-green-500/20 text-green-600' : sow.status === 'In Progress' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {sow.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">{sowTasks.length > 0 ? `${prog}% (${doneCount}/${sowTasks.length})` : '—'}</td>
                              <td className="py-3 px-4 text-right">
                                <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditSow(sow); setSowModal(true); }}><Edit2 className="w-3 h-3" /></Button>
                                <Button size="sm" variant="outline" className="h-7 bg-background border-2 border-accentBrand text-accentBrand hover:bg-accentBrand/10" onClick={() => { setEstimateSow(sow); setEstimateModal(true); }}><DollarSign className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => handleSOWDelete(sow)}><Trash2 className="w-3 h-3" /></Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : scopeViewMode === 'portfolio' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSowItems.map((sow) => {
                    const sowTasks = tasks.filter((t) => t.sow_id === sow.id);
                    const sowPhotos = photos.filter((p) => p.sow_id === sow.id);
                    const sowMaterials = allMaterials.filter((m) => m.sow_id === sow.id);
                    const materialsWithPhotos = sowMaterials.filter((m) => m.product_photo_url);
                    const doneCount = sowTasks.filter((t) => t.status === 'Done').length;
                    const prog = sowTasks.length > 0 ? Math.round((doneCount / sowTasks.length) * 100) : 0;
                    return (
                      <Card key={sow.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-sm truncate">{sow.name}</CardTitle>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${sow.status === 'Complete' ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>{sow.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{sow.phase} · {sow.area_of_work || '—'}</p>
                          <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${prog}%` }} />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7" onClick={() => { setEditSow(sow); setSowModal(true); }}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                            <Button size="sm" variant="outline" className="bg-background border-2 border-accentBrand text-accentBrand hover:bg-accentBrand/10 text-xs h-7" onClick={() => { setEstimateSow(sow); setEstimateModal(true); }}><DollarSign className="w-3 h-3 mr-1" />Estimates</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleSOWDelete(sow)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                filteredSowItems.map((sow) => {
                  const sowTasks = tasks.filter((t) => t.sow_id === sow.id);
                  const sowPhotos = photos.filter((p) => p.sow_id === sow.id);
                  const sowMaterials = allMaterials.filter((m) => m.sow_id === sow.id);
                  const materialsWithPhotos = sowMaterials.filter((m) => m.product_photo_url);
                  const materialsCount = sowMaterials.length;
                  return (
                    <RehabSOWCard
                      key={sow.id}
                      sow={sow}
                      tasks={sowTasks}
                      estimate={estimates[sow.id]}
                      materialsCount={materialsCount}
                      sowPhotos={sowPhotos}
                      materialsWithPhotos={materialsWithPhotos}
                      onEdit={(s) => { setEditSow(s); setSowModal(true); }}
                      onDelete={handleSOWDelete}
                      onAddTask={(s) => { setTaskTargetSow(s); setEditTask(null); setTaskModal(true); }}
                      onEditTask={(t) => { setEditTask(t); setTaskTargetSow(sowItems.find((s) => s.id === t.sow_id)); setTaskModal(true); }}
                      onDeleteTask={handleTaskDelete}
                      onToggleTaskStatus={handleToggleTaskStatus}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 gap-1 text-xs bg-background border-2 border-accentBrand text-accentBrand hover:bg-accentBrand/10"
                        onClick={() => { setEstimateSow(sow); setEstimateModal(true); }}
                      >
                        <DollarSign className="w-3 h-3" />
                        Edit Estimates
                      </Button>
                    </RehabSOWCard>
                  );
                })
              )}

              {/* Unassigned tasks */}
              {tasks.filter((t) => !t.sow_id).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Unassigned Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tasks.filter((t) => !t.sow_id).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 group">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'Done' ? 'border-green-500 bg-green-500/20' : 'border-border hover:border-muted-foreground'}`}
                          >
                            {task.status === 'Done' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                          </button>
                          <span className={`flex-1 text-sm ${task.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button onClick={() => { setEditTask(task); setTaskModal(true); }} className="p-1 text-muted-foreground hover:text-foreground rounded">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleTaskDelete(task)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Timeline Tab ──────────────────────────────────────────────────── */}
            <TabsContent value="timeline">
              <RehabTimelineDashboard sowItems={sowItems} />
            </TabsContent>

            {/* ── Budget Tab ────────────────────────────────────────────────────── */}
            <TabsContent value="budget">
              <BudgetVsActualTracker sowItems={sowItems} estimates={estimates} />
            </TabsContent>

            {/* ── Materials Tab ─────────────────────────────────────────────────── */}
            <TabsContent value="materials">
              <MaterialsLog
                sowItems={sowItems}
                dealId={dealId}
                onDataChange={() => loadAll()}
              />
            </TabsContent>

            {/* ── Photos Tab ────────────────────────────────────────────────────── */}
            <TabsContent value="photos">
              <PhotoJournal
                dealId={dealId}
                sowItems={sowItems}
                tasks={tasks}
                photos={photos}
                onPhotosChange={setPhotos}
              />
            </TabsContent>

            {/* ── Issues Tab ────────────────────────────────────────────────────── */}
            <TabsContent value="issues">
              <RiskIssueLog
                dealId={dealId}
                issues={issues}
                onIssuesChange={setIssues}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* SOW Modal */}
      <Dialog open={sowModal} onOpenChange={(v) => { setSowModal(v); if (!v) setEditSow(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSow ? 'Edit Scope Item' : 'Add Scope Item'}</DialogTitle>
          </DialogHeader>
          <SOWForm
            initial={editSow ? {
              name: editSow.name,
              category: editSow.category || '',
              area_of_work: editSow.area_of_work || '',
              phase: editSow.phase || '',
              objectives: editSow.objectives || '',
              duration_days: editSow.duration_days || '',
              start_date: editSow.start_date || '',
              end_date: editSow.end_date || '',
              status: editSow.status,
              notes: editSow.notes || '',
            } : EMPTY_SOW}
            phases={phases}
            onSubmit={handleSOWSave}
            onCancel={() => { setSowModal(false); setEditSow(null); }}
            loading={savingSOW}
          />
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={taskModal} onOpenChange={(v) => { setTaskModal(v); if (!v) { setEditTask(null); setTaskTargetSow(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTask ? 'Edit Task' : `Add Task${taskTargetSow ? ` — ${taskTargetSow.name}` : ''}`}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            initial={editTask ? {
              title: editTask.title,
              status: editTask.status,
              assigned_to: editTask.assigned_to || '',
              planned_start: editTask.planned_start || '',
              planned_end: editTask.planned_end || '',
              notes: editTask.notes || '',
            } : EMPTY_TASK}
            phases={phases}
            onSubmit={handleTaskSave}
            onCancel={() => { setTaskModal(false); setEditTask(null); setTaskTargetSow(null); }}
            loading={savingTask}
          />
        </DialogContent>
      </Dialog>

      {/* Estimate Modal */}
      <EstimateEditor
        sow={estimateSow}
        estimate={estimateSow ? estimates[estimateSow.id] : null}
        open={estimateModal}
        onClose={() => { setEstimateModal(false); setEstimateSow(null); }}
        onSaved={handleEstimateSaved}
      />
    </>
  );
};

export default ProjectManagementDealPage;
