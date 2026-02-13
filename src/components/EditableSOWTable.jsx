import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Save, X } from 'lucide-react';
import { parseSOWLineItems, serializeSOWWithLineItems, extractSOWTierBudgets } from '@/utils/sowParser';

const CATEGORY_OPTIONS = ['Exterior', 'Kitchen', 'Bathrooms', 'Systems', 'Finishes', 'General', 'Other'];

const EditableSOWTable = ({ sowText, readOnly, onSave, onCancel }) => {
  const { lineItems: initialItems, tiers: initialTiers } = parseSOWLineItems(sowText || '');
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    if (Array.isArray(initialItems) && initialItems.length > 0) {
      setLineItems(initialItems.map((r, i) => ({ ...r, id: r.id || `row-${i + 1}` })));
    } else {
      setLineItems([{ id: 'row-1', category: 'General', item: '', cost: 0 }]);
    }
  }, [sowText]);

  const updateRow = (index, field, value) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRow = () => {
    const lastCat = lineItems.length > 0 ? lineItems[lineItems.length - 1].category : 'General';
    setLineItems((prev) => [...prev, { id: `row-${Date.now()}`, category: lastCat, item: '', cost: 0 }]);
  };

  const removeRow = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getCategorySubtotals = () => {
    const subs = {};
    for (const row of lineItems) {
      const cat = row.category || 'General';
      subs[cat] = (subs[cat] || 0) + (Number(row.cost) || 0);
    }
    return subs;
  };

  const grandTotal = lineItems.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const subtotals = getCategorySubtotals();
  const origTiers = initialTiers || extractSOWTierBudgets(sowText || '');
  const origMid = origTiers.midGrade || grandTotal || 1;
  const scale = origMid > 0 ? grandTotal / origMid : 1;
  const recalcTiers = {
    budget: origTiers.budget != null ? Math.round(origTiers.budget * scale) : Math.round(grandTotal * 0.85),
    midGrade: grandTotal,
    highEnd: origTiers.highEnd != null ? Math.round(origTiers.highEnd * scale) : Math.round(grandTotal * 1.15),
  };

  const handleSave = () => {
    const validItems = lineItems.filter((r) => (r.item || '').trim() || (Number(r.cost) || 0) > 0);
    if (validItems.length === 0) return;
    const updatedSow = serializeSOWWithLineItems(sowText, validItems);
    onSave?.(updatedSow);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-transparent border-border">
              <TableHead className="w-[140px] text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground">Item</TableHead>
              <TableHead className="w-[120px] text-right text-muted-foreground">Cost ($)</TableHead>
              {!readOnly && <TableHead className="w-[70px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((row, index) => (
              <TableRow key={row.id} className="border-border">
                <TableCell>
                  {readOnly ? (
                    <span className="text-foreground">{row.category || 'General'}</span>
                  ) : (
                    <select
                      value={row.category || 'General'}
                      onChange={(e) => updateRow(index, 'category', e.target.value)}
                      className="w-full bg-background border border-input rounded px-2 py-1.5 text-sm text-foreground"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-foreground">{row.item || '—'}</span>
                  ) : (
                    <Input
                      value={row.item || ''}
                      onChange={(e) => updateRow(index, 'item', e.target.value)}
                      placeholder="Line item"
                      className="bg-background border-input text-foreground"
                    />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {readOnly ? (
                    <span className="font-mono text-foreground">${(Number(row.cost) || 0).toLocaleString()}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={row.cost === 0 ? '' : row.cost}
                      onChange={(e) => updateRow(index, 'cost', parseInt(e.target.value, 10) || 0)}
                      placeholder="0"
                      className="text-right bg-background border-input text-foreground font-mono"
                    />
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addRow} className="border-border text-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Row
        </Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Subtotals by Category</h4>
          {Object.entries(subtotals).map(([cat, amt]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{cat}</span>
              <span className="font-mono text-foreground">${amt.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Recalculated Totals</h4>
          <div className="flex justify-between text-sm font-medium">
            <span className="text-foreground">Grand Total</span>
            <span className="font-mono text-primary">${grandTotal.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <div className="flex justify-between">
              <span>Budget Tier</span>
              <span className="font-mono">${recalcTiers.budget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Mid-Grade Tier</span>
              <span className="font-mono">${recalcTiers.midGrade.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>High-End Tier</span>
              <span className="font-mono">${recalcTiers.highEnd.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={lineItems.filter((r) => (r.item || '').trim() || (Number(r.cost) || 0) > 0).length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
          <Button variant="outline" onClick={onCancel} className="border-border text-foreground">
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditableSOWTable;
