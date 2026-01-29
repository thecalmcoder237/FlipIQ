
import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Trash2, RefreshCw } from "lucide-react";
import { applyScenarioAdjustments } from '@/utils/advancedDealCalculations';
import { projectionService } from '@/services/projectionService';
import { useToast } from "@/components/ui/use-toast";

const ScenarioToggle = ({ deal, originalMetrics, onScenarioUpdate }) => {
  const [enabled, setEnabled] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('base');
  const [adjustments, setAdjustments] = useState({
    rehabOverrunPercent: 0,
    holdingPeriodAdjustment: 0,
    marketAppreciationPercent: 0,
    permitDelayDays: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (deal?.id) loadScenarios();
  }, [deal?.id]);

  useEffect(() => {
    if (enabled) {
      const results = applyScenarioAdjustments(deal, adjustments);
      onScenarioUpdate(results);
    } else {
      onScenarioUpdate(originalMetrics);
    }
  }, [enabled, adjustments, deal, originalMetrics]);

  const loadScenarios = async () => {
    try {
      const data = await projectionService.getScenarios(deal.id);
      setScenarios(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      const name = prompt("Enter scenario name:");
      if (!name) return;
      
      const newScenario = {
        deal_id: deal.id,
        scenario_name: name,
        scenario_type: 'custom',
        adjustments: adjustments,
        results: applyScenarioAdjustments(deal, adjustments)
      };

      const saved = await projectionService.saveScenario(newScenario);
      setScenarios([...scenarios, saved]);
      toast({ title: "Scenario Saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed" });
    }
  };

  const handleLoadScenario = (value) => {
    setActiveScenarioId(value);
    if (value === 'base') {
      setAdjustments({ rehabOverrunPercent: 0, holdingPeriodAdjustment: 0, marketAppreciationPercent: 0, permitDelayDays: 0 });
    } else if (value === 'worst') {
      setAdjustments({ rehabOverrunPercent: 20, holdingPeriodAdjustment: 3, marketAppreciationPercent: -10, permitDelayDays: 60 });
    } else if (value === 'best') {
      setAdjustments({ rehabOverrunPercent: -5, holdingPeriodAdjustment: -1, marketAppreciationPercent: 5, permitDelayDays: 0 });
    } else {
      const found = scenarios.find(s => s.id === value);
      if (found && found.adjustments) {
        setAdjustments(found.adjustments);
      }
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
        await projectionService.deleteScenario(id);
        setScenarios(scenarios.filter(s => s.id !== id));
        if (activeScenarioId === id) handleLoadScenario('base');
        toast({title: "Deleted"});
    } catch(err) { console.error(err); }
  };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
           <Switch checked={enabled} onCheckedChange={setEnabled} />
           <span className="font-bold text-white">Enable Scenario Mode</span>
        </div>
        
        {enabled && (
           <div className="flex gap-2">
              <Select value={activeScenarioId} onValueChange={handleLoadScenario}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-white/10">
                  <SelectValue placeholder="Select Scenario" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="base">Base Case</SelectItem>
                  <SelectItem value="best">Best Case</SelectItem>
                  <SelectItem value="worst">Worst Case</SelectItem>
                  {scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id} className="flex justify-between">
                       <span>{s.scenario_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeScenarioId !== 'base' && activeScenarioId !== 'best' && activeScenarioId !== 'worst' && (
                 <Button size="icon" variant="ghost" onClick={(e) => handleDelete(e, activeScenarioId)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></Button>
              )}
              <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save size={16} className="mr-2"/> Save</Button>
           </div>
        )}
      </div>

      {enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Rehab Overrun</span>
                    <span className={adjustments.rehabOverrunPercent > 0 ? "text-red-400" : "text-green-400"}>{adjustments.rehabOverrunPercent}%</span>
                 </div>
                 <Slider 
                   min={-20} max={50} step={5} 
                   value={[adjustments.rehabOverrunPercent]} 
                   onValueChange={(v) => setAdjustments({...adjustments, rehabOverrunPercent: v[0]})} 
                 />
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Holding Period Adj. (Months)</span>
                    <span className={adjustments.holdingPeriodAdjustment > 0 ? "text-red-400" : "text-green-400"}>{adjustments.holdingPeriodAdjustment > 0 ? '+' : ''}{adjustments.holdingPeriodAdjustment}</span>
                 </div>
                 <Slider 
                   min={-2} max={6} step={1} 
                   value={[adjustments.holdingPeriodAdjustment]} 
                   onValueChange={(v) => setAdjustments({...adjustments, holdingPeriodAdjustment: v[0]})} 
                 />
              </div>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Market Appreciation</span>
                    <span className={adjustments.marketAppreciationPercent < 0 ? "text-red-400" : "text-green-400"}>{adjustments.marketAppreciationPercent}%</span>
                 </div>
                 <Slider 
                   min={-15} max={15} step={1} 
                   value={[adjustments.marketAppreciationPercent]} 
                   onValueChange={(v) => setAdjustments({...adjustments, marketAppreciationPercent: v[0]})} 
                 />
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Permit Delay (Days)</span>
                    <span className={adjustments.permitDelayDays > 0 ? "text-red-400" : "text-green-400"}>{adjustments.permitDelayDays}</span>
                 </div>
                 <Slider 
                   min={0} max={180} step={15} 
                   value={[adjustments.permitDelayDays]} 
                   onValueChange={(v) => setAdjustments({...adjustments, permitDelayDays: v[0]})} 
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioToggle;
