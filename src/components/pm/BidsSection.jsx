import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Paperclip, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { bidsService } from '@/services/projectManagementService';
import { supabase } from '@/lib/customSupabaseClient';

function formatCurrency(n) {
  if (!n && n !== 0) return '$0';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MAX_BIDS_PER_SOW = 3;

const BidsSection = ({ dealId, sowItems = [] }) => {
  const [bidsBySow, setBidsBySow] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [activeSow, setActiveSow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bidder_name: '', amount: '', notes: '', document_url: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileRef = React.useRef();
  const { toast } = useToast();

  const loadBids = async () => {
    if (!dealId) return;
    setLoading(true);
    try {
      const all = await bidsService.getForDeal(dealId);
      const bySow = {};
      (all || []).forEach((b) => {
        const sowId = b.sow_id;
        if (!bySow[sowId]) bySow[sowId] = [];
        bySow[sowId].push(b);
      });
      setBidsBySow(bySow);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error loading bids', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBids();
  }, [dealId]);

  const openAdd = (sow) => {
    const current = (bidsBySow[sow.id] || []).length;
    if (current >= MAX_BIDS_PER_SOW) {
      toast({ variant: 'destructive', title: 'Limit reached', description: `Up to ${MAX_BIDS_PER_SOW} bids per scope item.` });
      return;
    }
    setActiveSow(sow);
    setEditingBid(null);
    setForm({ bidder_name: '', amount: '', notes: '', document_url: '' });
    setModalOpen(true);
  };

  const openEdit = (sow, bid) => {
    setActiveSow(sow);
    setEditingBid(bid);
    setForm({
      bidder_name: bid.bidder_name || '',
      amount: bid.amount ?? '',
      notes: bid.notes || '',
      document_url: bid.document_url || '',
    });
    setModalOpen(true);
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !dealId || !activeSow) return;
    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${dealId}/bids/${activeSow.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('materials-receipts').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('materials-receipts').getPublicUrl(path);
      setForm((p) => ({ ...p, document_url: data?.publicUrl || '' }));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err?.message });
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        bidder_name: form.bidder_name.trim(),
        amount: parseFloat(form.amount) || 0,
        notes: form.notes.trim() || null,
        document_url: form.document_url || null,
      };
      if (editingBid) {
        await bidsService.update(editingBid.id, payload);
        toast({ title: 'Bid updated' });
      } else {
        await bidsService.create(activeSow.id, {
          ...payload,
          sort_order: (bidsBySow[activeSow.id] || []).length,
        });
        toast({ title: 'Bid added' });
      }
      setModalOpen(false);
      await loadBids();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bid) => {
    if (!confirm('Delete this bid?')) return;
    try {
      await bidsService.delete(bid.id);
      toast({ title: 'Deleted' });
      await loadBids();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  if (sowItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Add scope items first, then add contractor bids (up to 3 per item).</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Contractor Bids
            </CardTitle>
            <p className="text-xs text-muted-foreground">Store up to 3 bids per scope item and attach bid documents.</p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                {sowItems.map((sow) => {
                  const bids = bidsBySow[sow.id] || [];
                  return (
                    <div key={sow.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-foreground">{sow.name}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => openAdd(sow)}
                          disabled={bids.length >= MAX_BIDS_PER_SOW}
                        >
                          <Plus className="w-3 h-3" />
                          Add bid ({bids.length}/{MAX_BIDS_PER_SOW})
                        </Button>
                      </div>
                      {bids.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No bids yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {bids.map((b) => (
                            <li key={b.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-foreground">{b.bidder_name}</span>
                                <span className="text-primary">{formatCurrency(b.amount)}</span>
                                {b.document_url && (
                                  <a href={b.document_url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground" title="View document">
                                    <Paperclip className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(sow, b)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDelete(b)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBid ? 'Edit bid' : `Add bid — ${activeSow?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Bidder name *</label>
              <input
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
                value={form.bidder_name}
                onChange={(e) => setForm((p) => ({ ...p, bidder_name: e.target.value }))}
                placeholder="Contractor or company"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Scope details, conditions…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Bid document</label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadDoc} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadingDoc}>
                  {uploadingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {form.document_url ? 'Replace' : 'Upload'}
                </Button>
                {form.document_url && (
                  <a href={form.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                    <FileText className="w-3 h-3" /> View
                  </a>
                )}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.bidder_name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BidsSection;
