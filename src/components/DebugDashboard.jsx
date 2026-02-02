
import React, { useState } from 'react';
import { Terminal, Database, Calculator, Activity, XCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DebugDashboard = ({ 
  formInputs, 
  loadedData, 
  convertedInputs, 
  calculations, 
  propertyData, 
  rehabSOW
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Replaced process.env.NODE_ENV with import.meta.env.MODE for Vite compatibility
  if (import.meta.env.MODE !== 'development') return null;

  const StatusIcon = ({ valid }) => valid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;

  // Validation Checks: non-empty response object counts as fetched; hint when no address
  const propertyIntelFetched = !!propertyData && typeof propertyData === 'object' && Object.keys(propertyData).length > 0;
  const propertyIntelHasData = !!propertyData?.address;
  const checks = {
    formInputs: !!formInputs && Object.keys(formInputs).length > 0,
    loadedData: !!loadedData && !!loadedData.id,
    convertedInputs: !!convertedInputs && !!convertedInputs.address,
    calculations: !!calculations && typeof calculations.score === 'number',
    propertyData: propertyIntelFetched,
    propertyDataHasAddress: propertyIntelHasData,
    rehabSOW: !!rehabSOW && rehabSOW.length > 0
  };

  const renderJson = (data) => (
    <pre className="bg-slate-950 p-4 rounded-md overflow-x-auto text-xs font-mono text-green-400 max-h-[300px]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-slate-900 border-t border-white/10 shadow-2xl">
        <div 
          className="flex items-center justify-between p-2 px-4 cursor-pointer hover:bg-slate-800"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-4">
            <Terminal className="w-4 h-4 text-gold-500" />
            <span className="font-mono text-xs font-bold text-white">DEBUG DASHBOARD</span>
            <div className="flex gap-2">
              <Badge variant="outline" className={checks.formInputs ? "border-green-500/50 text-green-500" : "border-gray-700 text-gray-500"}>Inputs</Badge>
              <Badge variant="outline" className={checks.loadedData ? "border-green-500/50 text-green-500" : "border-gray-700 text-gray-500"}>DB Load</Badge>
              <Badge variant="outline" className={checks.calculations ? "border-green-500/50 text-green-500" : "border-gray-700 text-gray-500"}>Calcs</Badge>
            </div>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>

        {isOpen && (
          <div className="p-4 border-t border-white/10 h-[500px] overflow-y-auto bg-slate-900">
            <div className="flex gap-2 mb-4">
              <Button variant={activeTab === 'summary' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('summary')}>Summary</Button>
              <Button variant={activeTab === 'inputs' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('inputs')}>Inputs State</Button>
              <Button variant={activeTab === 'db' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('db')}>DB Record</Button>
              <Button variant={activeTab === 'calcs' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('calcs')}>Calculations</Button>
              <Button variant={activeTab === 'intel' ? "default" : "outline"} size="sm" onClick={() => setActiveTab('intel')}>Intel & SOW</Button>
            </div>

            {activeTab === 'summary' && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-800 border-white/10">
                  <CardHeader><CardTitle className="text-sm">Data Flow Status</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                     <div className="flex justify-between items-center text-sm"><span>Form Inputs Present</span> <StatusIcon valid={checks.formInputs} /></div>
                     <div className="flex justify-between items-center text-sm"><span>Loaded from DB</span> <StatusIcon valid={checks.loadedData} /></div>
                     <div className="flex justify-between items-center text-sm"><span>Converted to CamelCase</span> <StatusIcon valid={checks.convertedInputs} /></div>
                     <div className="flex justify-between items-center text-sm"><span>Calculations Run</span> <StatusIcon valid={checks.calculations} /></div>
                     <div className="flex justify-between items-center text-sm"><span>Property Intel Fetched</span> <StatusIcon valid={checks.propertyData} /></div>
                     {checks.propertyData && !checks.propertyDataHasAddress && (
                       <div className="text-xs text-amber-400 pl-2">Fetched but no match (no address)</div>
                     )}
                     <div className="flex justify-between items-center text-sm"><span>SOW Generated</span> <StatusIcon valid={checks.rehabSOW} /></div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-white/10">
                   <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
                   <CardContent className="flex flex-col gap-2">
                      <Button size="sm" variant="secondary" onClick={() => console.log('Full State:', { formInputs, loadedData, calculations })}>Log Full State to Console</Button>
                   </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'inputs' && renderJson(formInputs || { error: 'No inputs state' })}
            {activeTab === 'db' && renderJson(loadedData || { error: 'No DB data loaded' })}
            {activeTab === 'calcs' && renderJson(calculations || { error: 'No calculations' })}
            {activeTab === 'intel' && (
              <div className="space-y-4">
                <div>
                   <h4 className="text-white text-xs font-bold mb-2">Property Intelligence</h4>
                   {renderJson(propertyData || { status: 'Not fetched' })}
                </div>
                <div>
                   <h4 className="text-white text-xs font-bold mb-2">Rehab SOW</h4>
                   {renderJson(rehabSOW ? { length: rehabSOW.length, preview: rehabSOW.substring(0, 100) + '...' } : { status: 'Not generated' })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugDashboard;
