import React, { useState } from 'react';
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
};

/**
 * Modal to add a single comparable (manual entry).
 * Builds a comp object in canonical shape; parent should run through normalizeComp if needed and merge into recentComps.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (comp: Record<string, unknown>) => void }} props
 */
export default function AddCompModal({ open, onOpenChange, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');

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
    const comp = {
      address,
      salePrice: Number(salePrice),
      saleDate: form.saleDate?.trim() || undefined,
      sqft: form.sqft?.trim() ? (Number(form.sqft) || form.sqft) : undefined,
      yearBuilt: form.yearBuilt?.trim() ? (Number(form.yearBuilt) || form.yearBuilt) : undefined,
      beds: form.beds?.trim() ? (Number(form.beds) || form.beds) : undefined,
      baths: form.baths?.trim() ? (Number(form.baths) || form.baths) : undefined,
      dom: form.dom?.trim() ? (Number(form.dom) || form.dom) : undefined,
    };
    onSubmit(comp);
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
          <DialogTitle>Add Comparable Sale</DialogTitle>
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
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Add Comp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
