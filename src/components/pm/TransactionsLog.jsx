import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  Loader2,
  Upload,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  transactionsService,
  vendorsService,
  paymentMethodsService,
} from '@/services/projectManagementService';

function formatCurrency(n) {
  if (!n && n !== 0) return '$0';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TRANSACTION_TYPES = [
  { value: 'labor', label: 'Labor' },
  { value: 'permits', label: 'Permits' },
];

const EMPTY_FORM = {
  sow_id: '',
  estimate_type: 'labor',
  amount: '',
  transaction_date: new Date().toISOString().slice(0, 10),
  payee_id: '',
  payee_name: '',
  payment_method_id: '',
  check_number: '',
  notes: '',
  invoice_url: '',
};

const TransactionForm = ({
  sowItems,
  vendors,
  paymentMethods,
  initial,
  onSubmit,
  onCancel,
  loading,
  dealId,
  onUploadInvoice,
  onUploadError,
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !dealId || !form.id || !onUploadInvoice) return;
    setUploading(true);
    try {
      const url = await onUploadInvoice(dealId, form.id, file);
      set('invoice_url', url);
    } catch (err) {
      onUploadError?.(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Scope item *</label>
        <Select value={form.sow_id} onValueChange={(v) => set('sow_id', v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select scope item" /></SelectTrigger>
          <SelectContent>
            {sowItems.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Type *</label>
        <Select value={form.estimate_type} onValueChange={(v) => set('estimate_type', v)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Amount ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
          <input
            type="date"
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
            value={form.transaction_date}
            onChange={(e) => set('transaction_date', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Payee</label>
        <Select value={form.payee_id || 'none'} onValueChange={(v) => set('payee_id', v === 'none' ? '' : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select vendor or enter name below" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Enter name below —</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!form.payee_id && (
          <input
            className="w-full mt-1 bg-muted border border-input rounded-lg px-3 py-2 text-sm"
            value={form.payee_name}
            onChange={(e) => set('payee_name', e.target.value)}
            placeholder="Payee name"
          />
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Payment method</label>
        <Select value={form.payment_method_id || 'none'} onValueChange={(v) => set('payment_method_id', v === 'none' ? '' : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {paymentMethods.map((pm) => (
              <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Check / reference #</label>
        <input
          className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
          value={form.check_number}
          onChange={(e) => set('check_number', e.target.value)}
          placeholder="e.g. 1742"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
        <textarea
          className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm resize-none"
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="e.g. Partial framing payment #2"
        />
      </div>
      {form.id && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice / receipt</label>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {form.invoice_url ? 'Replace' : 'Upload'}
            </Button>
            {form.invoice_url && (
              <a href={form.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                <FileText className="w-3 h-3" /> View
              </a>
            )}
          </div>
        </div>
      )}
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button
          onClick={() =>
            onSubmit({
              sow_id: form.sow_id,
              estimate_type: form.estimate_type,
              amount: parseFloat(form.amount) || 0,
              transaction_date: form.transaction_date,
              payee_id: form.payee_id || null,
              payee_name: form.payee_name || null,
              payment_method_id: form.payment_method_id || null,
              check_number: form.check_number || null,
              notes: form.notes || null,
              invoice_url: form.invoice_url || null,
            })
          }
          disabled={loading || !form.sow_id || !form.amount}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};

const TransactionsLog = ({ dealId, sowItems = [], onDataChange }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSow, setFilterSow] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  const loadData = async () => {
    if (!dealId || !currentUser?.id) return;
    setLoading(true);
    try {
      const [txData, vendorsData, methodsData] = await Promise.all([
        transactionsService.getForDeal(dealId),
        vendorsService.getForUser(currentUser.id).catch(() => []),
        paymentMethodsService.getForUser(currentUser.id).catch(() => []),
      ]);
      setTransactions(txData || []);
      setVendors(vendorsData || []);
      setPaymentMethods(methodsData || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error loading transactions', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dealId, currentUser?.id]);

  const openAdd = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editRow) {
        await transactionsService.update(editRow.id, { ...payload, deal_id: dealId });
        toast({ title: 'Transaction updated' });
      } else {
        await transactionsService.create({ ...payload, deal_id: dealId });
        toast({ title: 'Transaction added' });
      }
      setModalOpen(false);
      await loadData();
      onDataChange?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete this transaction? Actuals will be recalculated.')) return;
    try {
      await transactionsService.delete(row.id);
      toast({ title: 'Deleted' });
      await loadData();
      onDataChange?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const filtered = useMemo(() => {
    let list = transactions;
    const q = (search || '').toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          (t.rehab_sow?.name || '').toLowerCase().includes(q) ||
          (t.payee_name || '').toLowerCase().includes(q) ||
          (t.project_vendors?.name || '').toLowerCase().includes(q) ||
          (t.check_number || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q)
      );
    }
    if (filterSow !== 'all') list = list.filter((t) => t.sow_id === filterSow);
    if (filterType !== 'all') list = list.filter((t) => t.estimate_type === filterType);
    return list;
  }, [transactions, search, filterSow, filterType]);

  const sowName = (sowId) => sowItems.find((s) => s.id === sowId)?.name || '—';
  const payeeDisplay = (t) => t.project_vendors?.name || t.payee_name || '—';

  if (sowItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Add scope items first, then log labor and permit payments here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Transactions
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground"
                  onClick={() => navigate('/project-management/vendors')}
                >
                  <Users className="w-3 h-3" />
                  Vendors &amp; payment methods
                </Button>
                <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openAdd}>
                <Plus className="w-3 h-3" />
                Add transaction
              </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by scope, payee, check #…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-muted border border-input rounded-lg"
                />
              </div>
              <Select value={filterSow} onValueChange={setFilterSow}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scopes</SelectItem>
                  {sowItems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {transactions.length === 0 ? 'No transactions yet. Add labor or permit payments above.' : 'No transactions match your search.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Scope</th>
                      <th className="text-left py-2 font-medium">Type</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                      <th className="text-left py-2 font-medium">Payee</th>
                      <th className="text-left py-2 font-medium">Method</th>
                      <th className="text-left py-2 font-medium">Check #</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="py-2">{t.transaction_date}</td>
                        <td className="py-2">{t.rehab_sow?.name ?? sowName(t.sow_id)}</td>
                        <td className="py-2 capitalize">{t.estimate_type}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(t.amount)}</td>
                        <td className="py-2">{payeeDisplay(t)}</td>
                        <td className="py-2">{t.payment_methods?.name ?? '—'}</td>
                        <td className="py-2">{t.check_number || '—'}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            {t.invoice_url && (
                              <a href={t.invoice_url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground" title="View invoice">
                                <FileText className="w-3 h-3" />
                              </a>
                            )}
                            <button onClick={() => openEdit(t)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(t)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRow ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            sowItems={sowItems}
            vendors={vendors}
            paymentMethods={paymentMethods}
            initial={
              editRow
                ? {
                    id: editRow.id,
                    sow_id: editRow.sow_id,
                    estimate_type: editRow.estimate_type,
                    amount: editRow.amount,
                    transaction_date: editRow.transaction_date,
                    payee_id: editRow.payee_id || '',
                    payee_name: editRow.payee_name || '',
                    payment_method_id: editRow.payment_method_id || '',
                    check_number: editRow.check_number || '',
                    notes: editRow.notes || '',
                    invoice_url: editRow.invoice_url || '',
                  }
                : { ...EMPTY_FORM, sow_id: sowItems[0]?.id }
            }
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            loading={saving}
            dealId={dealId}
            onUploadInvoice={transactionsService.uploadInvoice}
            onUploadError={(err) => toast({ variant: 'destructive', title: 'Upload failed', description: err?.message })}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionsLog;
