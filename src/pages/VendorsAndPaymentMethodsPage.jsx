import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { vendorsService, paymentMethodsService } from '@/services/projectManagementService';
import Breadcrumb from '@/components/Breadcrumb';

const VendorsAndPaymentMethodsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorModal, setVendorModal] = useState(false);
  const [methodModal, setMethodModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editingMethod, setEditingMethod] = useState(null);
  const [vendorForm, setVendorForm] = useState({ name: '', contact_info: '' });
  const [methodForm, setMethodForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingW9, setUploadingW9] = useState(false);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [v, pm] = await Promise.all([
        vendorsService.getForUser(currentUser.id),
        paymentMethodsService.getForUser(currentUser.id),
      ]);
      setVendors(v || []);
      setPaymentMethods(pm || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error loading', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const openAddVendor = () => {
    setEditingVendor(null);
    setVendorForm({ name: '', contact_info: '' });
    setVendorModal(true);
  };

  const openEditVendor = (v) => {
    setEditingVendor(v);
    setVendorForm({ name: v.name || '', contact_info: v.contact_info || '' });
    setVendorModal(true);
  };

  const saveVendor = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      if (editingVendor) {
        await vendorsService.update(editingVendor.id, {
          name: vendorForm.name.trim(),
          contact_info: vendorForm.contact_info.trim() || null,
        });
        toast({ title: 'Vendor updated' });
      } else {
        await vendorsService.create(currentUser.id, {
          name: vendorForm.name.trim(),
          contact_info: vendorForm.contact_info.trim() || null,
        });
        toast({ title: 'Vendor added' });
      }
      setVendorModal(false);
      await loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteVendor = async (v) => {
    if (!confirm(`Delete vendor "${v.name}"?`)) return;
    try {
      await vendorsService.delete(v.id);
      toast({ title: 'Vendor deleted' });
      await loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const openAddMethod = () => {
    setEditingMethod(null);
    setMethodForm({ name: '' });
    setMethodModal(true);
  };

  const openEditMethod = (m) => {
    setEditingMethod(m);
    setMethodForm({ name: m.name || '' });
    setMethodModal(true);
  };

  const saveMethod = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      if (editingMethod) {
        await paymentMethodsService.update(editingMethod.id, { name: methodForm.name.trim() });
        toast({ title: 'Payment method updated' });
      } else {
        await paymentMethodsService.create(currentUser.id, { name: methodForm.name.trim() });
        toast({ title: 'Payment method added' });
      }
      setMethodModal(false);
      await loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteMethod = async (m) => {
    if (!confirm(`Delete "${m.name}"?`)) return;
    try {
      await paymentMethodsService.delete(m.id);
      toast({ title: 'Deleted' });
      await loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleW9Upload = async (vendorId, file) => {
    if (!currentUser?.id || !file) return;
    setUploadingW9(true);
    try {
      const url = await vendorsService.uploadW9(currentUser.id, vendorId, file);
      await vendorsService.update(vendorId, { w9_url: url });
      toast({ title: 'W-9 uploaded' });
      await loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e.message });
    } finally {
      setUploadingW9(false);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <Helmet>
        <title>Vendors &amp; Payment Methods · FlipIQ</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
          <Breadcrumb />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/project-management')}
            className="gap-1 text-muted-foreground hover:text-foreground mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Project Management
          </Button>
          <h1 className="text-2xl font-bold text-foreground mb-6">Vendors &amp; Payment Methods</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Manage contractors and suppliers for transactions. Add payment methods (e.g. Check, Wire) for consistent logging.
          </p>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Vendors
                    </CardTitle>
                    <Button size="sm" className="gap-1" onClick={openAddVendor}>
                      <Plus className="w-3 h-3" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {vendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No vendors yet. Add contractors or suppliers to use in transactions.</p>
                  ) : (
                    <ul className="space-y-2">
                      {vendors.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                          <div>
                            <span className="font-medium text-foreground">{v.name}</span>
                            {v.contact_info && <p className="text-xs text-muted-foreground">{v.contact_info}</p>}
                            {v.w9_url && (
                              <a href={v.w9_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">W-9</a>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditVendor(v)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteVendor(v)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment methods
                    </CardTitle>
                    <Button size="sm" className="gap-1" onClick={openAddMethod}>
                      <Plus className="w-3 h-3" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No payment methods yet. E.g. Check, Wire, Credit Card.</p>
                  ) : (
                    <ul className="space-y-2">
                      {paymentMethods.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <span className="font-medium text-foreground">{m.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditMethod(m)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteMethod(m)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={vendorModal} onOpenChange={(v) => { setVendorModal(v); if (!v) setEditingVendor(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
                value={vendorForm.name}
                onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Contractor or company"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact</label>
              <input
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
                value={vendorForm.contact_info}
                onChange={(e) => setVendorForm((p) => ({ ...p, contact_info: e.target.value }))}
                placeholder="Phone, email"
              />
            </div>
            {editingVendor && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">W-9</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    id="w9-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleW9Upload(editingVendor.id, f);
                      e.target.value = '';
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => document.getElementById('w9-upload')?.click()} disabled={uploadingW9}>
                    {uploadingW9 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Upload W-9
                  </Button>
                  {editingVendor.w9_url && (
                    <a href={editingVendor.w9_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">View</a>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setVendorModal(false)} disabled={saving}>Cancel</Button>
              <Button onClick={saveVendor} disabled={saving || !vendorForm.name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={methodModal} onOpenChange={(v) => { setMethodModal(v); if (!v) setEditingMethod(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Edit payment method' : 'Add payment method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm"
                value={methodForm.name}
                onChange={(e) => setMethodForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Check, Wire, Credit Card"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setMethodModal(false)} disabled={saving}>Cancel</Button>
              <Button onClick={saveMethod} disabled={saving || !methodForm.name.trim()}>
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

export default VendorsAndPaymentMethodsPage;
