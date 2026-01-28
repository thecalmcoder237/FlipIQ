
import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCcw, Settings2 } from "lucide-react";
import { applyScenarioAdjustments } from '@/utils/advancedDealCalculations';
import { supabase } from '@/lib/customSupabaseClient';

const ScenarioModeToggle = ({ deal, inputs, onScenarioChange }) => {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState('base');
  const [adjustments, setAdjustments] = useState({
    rehabOverrunPercent: 0,
    holdingPeriodAdjustment: 0,
    marketAppreciationPercent: 0,
    permitDelayDays: 0
  });

  // Determine if toggle should be disabled based on incomplete data
  // We use inputs (camelCase) for validation as it's the latest state
  const isDataIncomplete = !inputs?.purchasePrice || !inputs?.arv;
  
  // Debug log why it might be disabled
  useEffect(() => {
    if (isDataIncomplete) {
        console.log("ScenarioToggle: Disabled. Missing critical inputs.", { 
            purchasePrice: inputs?.purchasePrice, 
            arv: inputs?.arv 
        });
    }
  }, [inputs?.purchasePrice, inputs?.arv]);

  // Sync internal enable state with saved preference if loaded
  useEffect(() => {
    if (inputs?.scenarioPredictionEnabled && !enabled) {
        console.log('ScenarioToggle: Enabling from saved preference');
        setEnabled(true);
    }
  }, [inputs?.scenarioPredictionEnabled]);

  const handleToggle = (val) => {
    console.log('Scenario Prediction Enabled:', val); // Debug logging as requested
    if (isDataIncomplete && val) return; // Prevent enabling if invalid
    setEnabled(val);
    
    // Optional: Persist this preference instantly
    if (deal?.id) {
       supabase.from('deals').update({ scenario_prediction_enabled: val }).eq('id', deal.id).then(({error}) => {
           if (error) console.error("Failed to save scenario toggle preference", error);
       });
    }
  };

  // Calculate scenarios when needed
  useEffect(() => {
    if (!enabled) {
      onScenarioChange(null); // Signal to use default metrics
      return;
    }

    let currentAdjustments = { ...adjustments };

    // Define presets
    if (mode === 'base') {
      currentAdjustments = { rehabOverrunPercent: 0, holdingPeriodAdjustment: 0, marketAppreciationPercent: 0, permitDelayDays: 0 };
    } else if (mode === 'best') {
      currentAdjustments = { rehabOverrunPercent: -10, holdingPeriodAdjustment: -1, marketAppreciationPercent: 5, permitDelayDays: 0 };
    } else if (mode === 'worst') {
      currentAdjustments = { rehabOverrunPercent: 25, holdingPeriodAdjustment: 3, marketAppreciationPercent: -10, permitDelayDays: 0 };
    } 
    // Custom uses state directly

    if (mode !== 'custom') {
       setAdjustments(currentAdjustments);
    }
    
    // Calculate and Propagate
    const results = applyScenarioAdjustments(deal, currentAdjustments);
    onScenarioChange(results, mode, currentAdjustments);

  }, [enabled, mode, adjustments.rehabOverrunPercent, adjustments.holdingPeriodAdjustment, adjustments.marketAppreciationPercent, adjustments.permitDelayDays, deal]);

  const handleSliderChange = (key, val) => {
    setMode('custom');
    setAdjustments(prev => ({ ...prev, [key]: val }));
  };

  return (
    <Card className={`bg-slate-900 border-white/10 mt-6 ${isDataIncomplete ? 'opacity-50 pointer-events-none' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Settings2 className="text-purple-400" /> Scenario Modeling
        </CardTitle>
        <div className="flex items-center gap-3">
           <span className={`text-sm ${enabled ? 'text-white' : 'text-gray-500'}`}>
              {enabled ? 'Active' : 'Disabled'}
           </span>
           <Switch 
              checked={enabled} 
              onCheckedChange={handleToggle} 
              disabled={isDataIncomplete}
           />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="pt-4 animate-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row gap-6">
             {/* Controls */}
             <div className="w-full md:w-1/3 space-y-4 border-r border-white/5 pr-0 md:pr-6">
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                    <SelectValue placeholder="Select Scenario" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white">
                    <SelectItem value="base">Base Case (Default)</SelectItem>
                    <SelectItem value="best">Best Case (Optimistic)</SelectItem>
                    <SelectItem value="worst">Worst Case (Pessimistic)</SelectItem>
                    <SelectItem value="custom">Custom Configuration</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-gray-400">
                   {mode === 'base' && "Standard projections with zero variance."}
                   {mode === 'best' && "Ideal conditions: lower costs, faster exit, market up."}
                   {mode === 'worst' && "Stress test: cost overruns, delays, market drop."}
                   {mode === 'custom' && "Manual adjustments enabled."}
                </div>
             </div>

             {/* Sliders */}
             <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Rehab Overrun</span>
                      <span className="text-white font-mono">{adjustments.rehabOverrunPercent > 0 ? '+' : ''}{adjustments.rehabOverrunPercent}%</span>
                   </div>
                   <Slider 
                      disabled={mode !== 'custom'}
                      min={-20} max={50} step={5} 
                      value={[adjustments.rehabOverrunPercent]} 
                      onValueChange={(v) => handleSliderChange('rehabOverrunPercent', v[0])}
                      className={mode !== 'custom' ? "opacity-50" : ""}
                   />
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Holding Period Adj. (Months)</span>
                      <span className="text-white font-mono">{adjustments.holdingPeriodAdjustment > 0 ? '+' : ''}{adjustments.holdingPeriodAdjustment}</span>
                   </div>
                   <Slider 
                      disabled={mode !== 'custom'}
                      min={-2} max={6} step={1} 
                      value={[adjustments.holdingPeriodAdjustment]} 
                      onValueChange={(v) => handleSliderChange('holdingPeriodAdjustment', v[0])}
                      className={mode !== 'custom' ? "opacity-50" : ""}
                   />
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Market Appreciation</span>
                      <span className="text-white font-mono">{adjustments.marketAppreciationPercent > 0 ? '+' : ''}{adjustments.marketAppreciationPercent}%</span>
                   </div>
                   <Slider 
                      disabled={mode !== 'custom'}
                      min={-15} max={15} step={1} 
                      value={[adjustments.marketAppreciationPercent]} 
                      onValueChange={(v) => handleSliderChange('marketAppreciationPercent', v[0])}
                      className={mode !== 'custom' ? "opacity-50" : ""}
                   />
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Permit Delay (Days)</span>
                      <span className="text-white font-mono">{adjustments.permitDelayDays}</span>
                   </div>
                   <Slider 
                      disabled={mode !== 'custom'}
                      min={0} max={180} step={15} 
                      value={[adjustments.permitDelayDays]} 
                      onValueChange={(v) => handleSliderChange('permitDelayDays', v[0])}
                      className={mode !== 'custom' ? "opacity-50" : ""}
                   />
                </div>
             </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ScenarioModeToggle;
