
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { projectionService } from '@/services/projectionService';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';

const HiddenCostsManager = ({ dealId, onUpdate }) => {
  const [costs, setCosts] = useState([]);
  const [newCost, setNewCost] = useState({ name: '', amount: '', category: 'Other', probability: 100 });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCosts();
  }, [dealId]);

  const loadCosts = async () => {
    try {
      const data = await projectionService.getHiddenCosts(dealId);
      setCosts(data || []);
      onUpdate(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async () => {
    if (!newCost.name || !newCost.amount) return;
    setLoading(true);
    try {
      const saved = await projectionService.saveHiddenCost({
        deal_id: dealId,
        cost_name: newCost.name,
        amount: parseFloat(newCost.amount),
        category: newCost.category,
        probability: newCost.probability
      });
      setCosts([saved, ...costs]);
      onUpdate([saved, ...costs]);
      setNewCost({ name: '', amount: '', category: 'Other', probability: 100 });
      toast({ title: "Cost Added" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to add cost", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await projectionService.deleteHiddenCost(id);
      const updated = costs.filter(c => c.id !== id);
      setCosts(updated);
      onUpdate(updated);
    } catch (error) {
      toast({ variant: "destructive", title: "Error deleting" });
    }
  };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
         <AlertCircle className="text-orange-400" size={20} />
         <h3 className="font-bold text-white">Risk & Hidden Costs Manager</h3>
      </div>
      
      {/* Add Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-slate-800/50 p-4 rounded-lg items-end">
         <div className="md:col-span-4 space-y-1">
            <label className="text-xs text-gray-400">Cost Description</label>
            <Input 
              value={newCost.name} 
              onChange={e => setNewCost({...newCost, name: e.target.value})}
              placeholder="e.g. Foundation Crack"
              className="bg-slate-900 border-white/10"
            />
         </div>
         <div className="md:col-span-3 space-y-1">
            <label className="text-xs text-gray-400">Estimated Amount</label>
            <Input 
              type="number"
              value={newCost.amount} 
              onChange={e => setNewCost({...newCost, amount: e.target.value})}
              placeholder="5000"
              className="bg-slate-900 border-white/10"
            />
         </div>
         <div className="md:col-span-3 space-y-1">
            <label className="text-xs text-gray-400">Probability: {newCost.probability}%</label>
            <Slider 
               value={[newCost.probability]}
               onValueChange={v => setNewCost({...newCost, probability: v[0]})}
               max={100}
               step={10}
               className="py-2"
            />
         </div>
         <div className="md:col-span-2">
            <Button onClick={handleAdd} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
               <Plus size={16} /> Add
            </Button>
         </div>
      </div>

      {/* List */}
      <div className="space-y-2">
         {costs.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No hidden risks identified yet.</p>}
         {costs.map(cost => (
            <div key={cost.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded border border-white/5">
               <div>
                  <p className="text-white text-sm font-medium">{cost.cost_name}</p>
                  <p className="text-xs text-gray-400">{cost.category} • {cost.probability}% Probability</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="text-right">
                     <p className="text-white font-mono">${cost.amount.toLocaleString()}</p>
                     <p className="text-xs text-orange-400">Risk: ${(cost.amount * (cost.probability/100)).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cost.id)} className="text-gray-500 hover:text-red-400">
                     <Trash2 size={16} />
                  </Button>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default HiddenCostsManager;
