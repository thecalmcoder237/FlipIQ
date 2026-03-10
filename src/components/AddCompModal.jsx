import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const labelClass = 'block text-sm font-medium text-foreground';

const defaultForm = {
  address: '',
  salePrice: '',
  saleDate: '',
  sqft: '',
  yearBuilt: '',
  beds: '',
  baths: '',
  dom: '',
  latitude: '',
  longitude: '',
};

function compToForm(comp) {
  if (!comp || typeof comp !== 'object') return defaultForm;
  return {
    address: comp.address ?? '',
    salePrice: comp.salePrice != null ? String(comp.salePrice) : (comp.price != null ? String(comp.price) : ''),
    saleDate: comp.saleDate ? String(comp.saleDate).slice(0, 10) : '',
    sqft: comp.sqft != null ? String(comp.sqft) : '',
    yearBuilt: comp.yearBuilt != null ? String(comp.yearBuilt) : '',
    beds: comp.beds != null ? String(comp.beds) : (comp.bedrooms != null ? String(comp.bedrooms) : ''),
    baths: comp.baths != null ? String(comp.baths) : (comp.bathrooms != null ? String(comp.bathrooms) : ''),
    dom: comp.dom != null ? String(comp.dom) : (comp.daysOnMarket != null ? String(comp.daysOnMarket) : ''),
    latitude: comp.latitude != null ? String(comp.latitude) : '',
    longitude: comp.longitude != null ? String(comp.longitude) : '',
  };
}

/**
 * Modal to add or edit a comparable. In edit mode pass initialComp and compIndex; onSubmit(comp, compIndex) will be called.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (comp: Record<string, unknown>, compIndex?: number) => void, initialComp?: Record<string, unknown> | null, compIndex?: number }} props
 */
export default function AddCompModal({ open, onOpenChange, onSubmit, initialComp = null, compIndex }) {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (initialComp) {
        setForm(compToForm(initialComp));
      } else {
        setForm(defaultForm);
      }
      setError('');
    }
  }, [open, initialComp]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const address = (form.address || '').trim();
    const salePriceRaw = (form.salePrice || '').trim().replace(/[$,]/g, '');
    const salePrice = salePriceRaw ? Number(salePriceRaw) : undefined;
    if (!address) {
      setError('Address is required.');
      return;
    }
    if (salePrice == null || salePrice === '' || (typeof salePrice === 'number' && !Number.isFinite(salePrice))) {
      setError('Sale price is required.');
      return;
    }
    const latNum = form.latitude?.trim() ? Number(form.latitude) : undefined;
    const lngNum = form.longitude?.trim() ? Number(form.longitude) : undefined;
    const comp = {
      address,
      salePrice: Number(salePrice),
      saleDate: form.saleDate?.trim() || undefined,
      sqft: form.sqft?.trim() ? (Number(form.sqft) || form.sqft) : undefined,
      yearBuilt: form.yearBuilt?.trim() ? (Number(form.yearBuilt) || form.yearBuilt) : undefined,
      beds: form.beds?.trim() ? (Number(form.beds) || form.beds) : undefined,
      baths: form.baths?.trim() ? (Number(form.baths) || form.baths) : undefined,
      dom: form.dom?.trim() ? (Number(form.dom) || form.dom) : undefined,
      latitude: latNum != null && Number.isFinite(latNum) ? latNum : undefined,
      longitude: lngNum != null && Number.isFinite(lngNum) ? lngNum : undefined,
    };
    onSubmit(comp, compIndex);
    setForm(defaultForm);
    setError('');
    onOpenChange(false);
  };

  const handleClose = (open) => {
    if (!open) {
      setForm(defaultForm);
      setError('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialComp ? 'Edit Comparable Sale' : 'Add Comparable Sale'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="comp-address" className={labelClass}>Address *</label>
            <Input
              id="comp-address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="123 Main St, City, ST 12345"
              className="bg-background border-input text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="comp-salePrice" className={labelClass}>Sale Price *</label>
            <Input
              id="comp-salePrice"
              name="salePrice"
              type="text"
              inputMode="numeric"
              value={form.salePrice}
              onChange={handleChange}
              placeholder="350000"
              className="bg-background border-input text-foreground"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="comp-saleDate" className={labelClass}>Sale Date</label>
              <Input
                id="comp-saleDate"
                name="saleDate"
                type="date"
                value={form.saleDate}
                onChange={handleChange}
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="comp-sqft" className={labelClass}>Sqft</label>
              <Input
                id="comp-sqft"
                name="sqft"
                type="text"
                inputMode="numeric"
                value={form.sqft}
                onChange={handleChange}
                placeholder="2000"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="comp-yearBuilt" className={labelClass}>Year Built</label>
              <Input
                id="comp-yearBuilt"
                name="yearBuilt"
                type="text"
                inputMode="numeric"
                value={form.yearBuilt}
                onChange={handleChange}
                placeholder="1995"
                className="bg-background border-input text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="comp-beds" className={labelClass}>Beds</label>
              <Input
                id="comp-beds"
                name="beds"
                type="text"
                inputMode="numeric"
                value={form.beds}
                onChange={handleChange}
                placeholder="3"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="comp-baths" className={labelClass}>Baths</label>
              <Input
                id="comp-baths"
                name="baths"
                type="text"
                inputMode="numeric"
                value={form.baths}
                onChange={handleChange}
                placeholder="2"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="comp-dom" className={labelClass}>DOM</label>
              <Input
                id="comp-dom"
                name="dom"
                type="text"
                inputMode="numeric"
                value={form.dom}
                onChange={handleChange}
                placeholder="14"
                className="bg-background border-input text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="comp-latitude" className={labelClass}>Latitude (for map)</label>
              <Input
                id="comp-latitude"
                name="latitude"
                type="text"
                inputMode="decimal"
                value={form.latitude}
                onChange={handleChange}
                placeholder="33.7490"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="comp-longitude" className={labelClass}>Longitude (for map)</label>
              <Input
                id="comp-longitude"
                name="longitude"
                type="text"
                inputMode="decimal"
                value={form.longitude}
                onChange={handleChange}
                placeholder="-84.3880"
                className="bg-background border-input text-foreground"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {initialComp ? 'Save changes' : 'Add Comp'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
