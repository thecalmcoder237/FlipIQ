import React, { useState, useRef } from 'react';
import { Package, Plus, Trash2, Edit2, Receipt, Upload, Loader2, Image, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { materialsService } from '@/services/projectManagementService';

const CATEGORIES = ['materials', 'tools', 'suppliers', 'appliances', 'fixtures'];

function formatCurrency(n) {
  if (!n && n !== 0) return '$0';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EMPTY_FORM = {
  product_name: '',
  quantity: 1,
  unit_amount: '',
  vendor: '',
  expense_date: '',
  category: 'materials',
  product_description: '',
  receipt_photo_url: '',
  product_photo_url: '',
};

const MaterialForm = ({ initial = EMPTY_FORM, onSubmit, onCancel, loading, dealId, sowId, onUploadReceipt, onUploadProduct, onUploadError }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const receiptRef = useRef();
  const productRef = useRef();
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_amount) || 0);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !dealId || !sowId || !onUploadReceipt) return;
    setUploadingReceipt(true);
    try {
      const url = await onUploadReceipt(dealId, sowId, file);
      set('receipt_photo_url', url);
    } catch (err) {
      onUploadError?.(err);
    } finally {
      setUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const handleProductUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !dealId || !sowId || !onUploadProduct) return;
    setUploadingProduct(true);
    try {
      const url = await onUploadProduct(dealId, sowId, file);
      set('product_photo_url', url);
    } catch (err) {
      onUploadError?.(err);
    } finally {
      setUploadingProduct(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name *</label>
          <input
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.product_name}
            onChange={(e) => set('product_name', e.target.value)}
            placeholder="e.g. Delta Faucet Model XYZ"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.unit_amount}
            onChange={(e) => set('unit_amount', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Vendor</label>
          <input
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.vendor}
            onChange={(e) => set('vendor', e.target.value)}
            placeholder="e.g. Home Depot"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Purchase Date</label>
          <input
            type="date"
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.expense_date}
            onChange={(e) => set('expense_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
          <select
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Description / Specs</label>
          <textarea
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={2}
            value={form.product_description}
            onChange={(e) => set('product_description', e.target.value)}
            placeholder="Color, model number, specs…"
          />
        </div>

        {/* Photo uploads */}
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Product Photo</label>
          <div className="flex items-center gap-2">
            <input ref={productRef} type="file" accept="image/*" className="hidden" onChange={handleProductUpload} />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => productRef.current?.click()} disabled={uploadingProduct || !dealId || !sowId}>
              {uploadingProduct ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
              {form.product_photo_url ? 'Change' : 'Upload'} Photo
            </Button>
            {form.product_photo_url && (
              <>
                <img src={form.product_photo_url} alt="Product" className="h-12 w-12 object-cover rounded-lg border" />
                <button type="button" onClick={() => set('product_photo_url', '')} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
              </>
            )}
          </div>
        </div>
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Receipt Photo</label>
          <div className="flex items-center gap-2">
            <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => receiptRef.current?.click()} disabled={uploadingReceipt || !dealId || !sowId}>
              {uploadingReceipt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />}
              {form.receipt_photo_url ? 'Change' : 'Upload'} Receipt
            </Button>
            {form.receipt_photo_url && (
              <>
                <img src={form.receipt_photo_url} alt="Receipt" className="h-12 w-12 object-cover rounded-lg border" />
                <button type="button" onClick={() => set('receipt_photo_url', '')} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
              </>
            )}
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
          Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={loading || !form.product_name}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};

const MaterialsLog = ({ sowItems = [], dealId, onDataChange }) => {
  const [materials, setMaterials] = useState({});    // sowId → array
  const [loadedSows, setLoadedSows] = useState({});  // track which sow materials are loaded
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeSow, setActiveSow] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadMaterials = async (sowId) => {
    if (loadedSows[sowId]) return;
    try {
      const data = await materialsService.getForSow(sowId);
      setMaterials((p) => ({ ...p, [sowId]: data }));
      setLoadedSows((p) => ({ ...p, [sowId]: true }));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error loading materials', description: e.message });
    }
  };

  const openAdd = (sow) => {
    loadMaterials(sow.id);
    setActiveSow(sow);
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (sow, item) => {
    setActiveSow(sow);
    setEditItem(item);
    setModalOpen(true);
  };

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      if (editItem) {
        const updated = await materialsService.update(editItem.id, {
          product_name: form.product_name,
          quantity: parseFloat(form.quantity) || 1,
          unit_amount: parseFloat(form.unit_amount) || 0,
          vendor: form.vendor || null,
          expense_date: form.expense_date || null,
          category: form.category,
          product_description: form.product_description || null,
          receipt_photo_url: form.receipt_photo_url || null,
          product_photo_url: form.product_photo_url || null,
        });
        setMaterials((p) => ({
          ...p,
          [activeSow.id]: (p[activeSow.id] || []).map((m) => m.id === editItem.id ? updated : m),
        }));
        toast({ title: 'Material updated' });
      } else {
        const created = await materialsService.create(activeSow.id, {
          product_name: form.product_name,
          quantity: parseFloat(form.quantity) || 1,
          unit_amount: parseFloat(form.unit_amount) || 0,
          vendor: form.vendor || null,
          expense_date: form.expense_date || null,
          category: form.category,
          product_description: form.product_description || null,
          receipt_photo_url: form.receipt_photo_url || null,
          product_photo_url: form.product_photo_url || null,
        });
        setMaterials((p) => ({
          ...p,
          [activeSow.id]: [created, ...(p[activeSow.id] || [])],
        }));
        toast({ title: 'Material added' });
      }
      setModalOpen(false);
      onDataChange?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error saving material', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sowId, item) => {
    if (!confirm(`Delete "${item.product_name}"?`)) return;
    try {
      await materialsService.delete(item.id);
      setMaterials((p) => ({
        ...p,
        [sowId]: (p[sowId] || []).filter((m) => m.id !== item.id),
      }));
      toast({ title: 'Deleted' });
      onDataChange?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  if (sowItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Add scope items to start logging materials.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {sowItems.map((sow) => {
          const sowMaterials = materials[sow.id];
          const totalSpent = (sowMaterials || []).reduce((a, m) => a + (m.total_amount ?? 0), 0);
          return (
            <Card key={sow.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{sow.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {sowMaterials && <span className="text-xs text-muted-foreground">{formatCurrency(totalSpent)} spent</span>}
                    <Button
                      size="sm"
                      className="h-7 gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => openAdd(sow)}
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </Button>
                    {!loadedSows[sow.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => loadMaterials(sow.id)}
                      >
                        Load
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {!loadedSows[sow.id] ? (
                  <p className="text-xs text-muted-foreground italic">Click "Load" to view materials.</p>
                ) : !sowMaterials || sowMaterials.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No materials logged yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border">
                          <th className="text-left py-2 font-medium">Product</th>
                          <th className="text-left py-2 font-medium">Vendor</th>
                          <th className="text-right py-2 font-medium">Qty</th>
                          <th className="text-right py-2 font-medium">Unit</th>
                          <th className="text-right py-2 font-medium">Total</th>
                          <th className="text-left py-2 font-medium">Date</th>
                          <th className="text-right py-2 font-medium w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sowMaterials.map((m) => (
                          <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                            <td className="py-2 pr-2">
                              <p className="font-medium text-foreground">{m.product_name}</p>
                              {m.product_description && (
                                <p className="text-muted-foreground truncate max-w-[160px]">{m.product_description}</p>
                              )}
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-muted rounded text-muted-foreground capitalize">
                                {m.category}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-muted-foreground">{m.vendor || '—'}</td>
                            <td className="py-2 text-right">{m.quantity}</td>
                            <td className="py-2 text-right">{formatCurrency(m.unit_amount)}</td>
                            <td className="py-2 text-right font-semibold text-foreground">{formatCurrency(m.total_amount)}</td>
                            <td className="py-2 text-muted-foreground">{m.expense_date || '—'}</td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {m.receipt_photo_url && (
                                  <a href={m.receipt_photo_url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground rounded" title="View receipt">
                                    <Receipt className="w-3 h-3" />
                                  </a>
                                )}
                                <button onClick={() => openEdit(sow, m)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDelete(sow.id, m)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border">
                          <td colSpan={4} className="py-2 text-right font-semibold text-foreground">Total:</td>
                          <td className="py-2 text-right font-bold text-foreground">{formatCurrency(totalSpent)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Material' : `Add Material — ${activeSow?.name}`}</DialogTitle>
          </DialogHeader>
          <MaterialForm
            initial={editItem ? {
              product_name: editItem.product_name,
              quantity: editItem.quantity,
              unit_amount: editItem.unit_amount,
              vendor: editItem.vendor || '',
              expense_date: editItem.expense_date || '',
              category: editItem.category,
              product_description: editItem.product_description || '',
              receipt_photo_url: editItem.receipt_photo_url || '',
              product_photo_url: editItem.product_photo_url || '',
            } : EMPTY_FORM}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            loading={saving}
            dealId={dealId}
            sowId={activeSow?.id}
            onUploadReceipt={(dealId, sowId, file) => materialsService.uploadReceipt(dealId, sowId, file)}
            onUploadProduct={(dealId, sowId, file) => materialsService.uploadProductPhoto(dealId, sowId, file)}
            onUploadError={(err) => toast({ variant: 'destructive', title: 'Upload failed', description: err?.message })}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MaterialsLog;
