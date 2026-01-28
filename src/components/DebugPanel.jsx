
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Terminal } from 'lucide-react';

const DebugPanel = ({ inputs, calculations, propertyData }) => {
  // Only show in development mode (or if explicitly enabled)
  if (import.meta.env.PROD) return null;

  const handleLogState = () => {
    console.group("🔍 FULL DEBUG STATE");
    console.log("Inputs:", inputs);
    console.log("Calculations:", calculations);
    console.log("Property Data:", propertyData);
    console.groupEnd();
  };

  const sowEligible = calculations?.score >= 60 && propertyData?.address;
  const intelEligible = calculations?.score >= 65;
  const addressValid = inputs?.address && inputs.address.trim().length >= 3;

  return (
    <Card className="fixed bottom-4 right-4 w-96 bg-black/90 border-red-500/30 shadow-2xl z-50 text-xs font-mono">
      <div className="bg-red-900/20 p-2 border-b border-red-500/20 flex justify-between items-center">
        <div className="flex items-center gap-2 text-red-400 font-bold">
          <Bug size={14} /> DEBUG PANEL
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => console.clear()}>
          <Terminal size={12} />
        </Button>
      </div>
      <CardContent className="p-4 space-y-2 text-gray-300 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="font-bold text-gray-500">Address Valid:</div>
          <div className={addressValid ? "text-green-400" : "text-red-400"}>
            {String(!!addressValid)} ({inputs?.address?.length || 0} chars)
          </div>

          <div className="font-bold text-gray-500">Address Value:</div>
          <div className="truncate" title={inputs?.address}>{inputs?.address || "undefined"}</div>

          <div className="font-bold text-gray-500">Deal Score:</div>
          <div className={calculations?.score >= 60 ? "text-green-400" : "text-yellow-400"}>
            {calculations?.score || 0}
          </div>

          <div className="font-bold text-gray-500">Intel Eligible:</div>
          <div className={intelEligible ? "text-green-400" : "text-red-400"}>
            {String(intelEligible)} (&gt;= 65)
          </div>

          <div className="font-bold text-gray-500">SOW Eligible:</div>
          <div className={sowEligible ? "text-green-400" : "text-red-400"}>
            {String(sowEligible)} (&gt;= 60 + Data)
          </div>

          <div className="font-bold text-gray-500">Has Prop Data:</div>
          <div className={propertyData ? "text-green-400" : "text-red-400"}>
            {String(!!propertyData)}
          </div>
          
           <div className="font-bold text-gray-500">Scenario Enabled:</div>
          <div className={inputs?.scenarioPredictionEnabled ? "text-green-400" : "text-gray-500"}>
            {String(!!inputs?.scenarioPredictionEnabled)}
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full h-7 text-xs border-white/20 hover:bg-white/10"
            onClick={handleLogState}
          >
            Log Full State to Console
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
