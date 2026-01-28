
import React, { useMemo } from 'react';
import { PieChart, Calculator, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateDealMetrics } from '@/utils/dealCalculations';

// Reusing shared logic to ensure consistency
const CostBreakdownCalculator = ({ inputs }) => {
  const metrics = useMemo(() => {
    if (!inputs) return null;
    return calculateDealMetrics(inputs);
  }, [inputs]);

  if (!inputs || !metrics) return <div className="p-8 text-center text-gray-400">Loading cost data...</div>;

  const { acquisition, rehab, holding, selling, totalProjectCost, totalCashInvested } = metrics;
  
  // Helpers for table rows
  const CostRow = ({ label, value, isTotal }) => (
      <TableRow className={isTotal ? "bg-slate-800/80 font-bold border-t border-white/20" : "border-white/5 hover:bg-white/5"}>
        <TableCell className="text-gray-300">{label}</TableCell>
        <TableCell className={`text-right ${isTotal ? "text-gold-400 text-base" : "text-white"}`}>
          ${(value || 0).toLocaleString()}
        </TableCell>
      </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-900/10 border-blue-500/20">
            <CardContent className="pt-6">
                <div className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-1">Acquisition</div>
                <div className="text-2xl font-bold text-white">${acquisition.total.toLocaleString()}</div>
            </CardContent>
        </Card>
        <Card className="bg-orange-900/10 border-orange-500/20">
            <CardContent className="pt-6">
                <div className="text-xs text-orange-300 font-bold uppercase tracking-wider mb-1">Rehab</div>
                <div className="text-2xl font-bold text-white">${rehab.total.toLocaleString()}</div>
            </CardContent>
        </Card>
        <Card className="bg-purple-900/10 border-purple-500/20">
            <CardContent className="pt-6">
                <div className="text-xs text-purple-300 font-bold uppercase tracking-wider mb-1">Holding</div>
                <div className="text-2xl font-bold text-white">${holding.total.toLocaleString()}</div>
            </CardContent>
        </Card>
        <Card className="bg-green-900/10 border-green-500/20">
            <CardContent className="pt-6">
                <div className="text-xs text-green-300 font-bold uppercase tracking-wider mb-1">Selling</div>
                <div className="text-2xl font-bold text-white">${selling.total.toLocaleString()}</div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="w-5 h-5 text-gold-400"/> Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent"><TableHead>Item</TableHead><TableHead className="text-right">Cost</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="bg-slate-800/50"><TableCell colSpan={2} className="font-bold text-blue-300">Acquisition</TableCell></TableRow>
                    <CostRow label="Down Payment" value={acquisition.downPayment} />
                    <CostRow label="Fees & Closing" value={acquisition.feesOnly} />
                    <CostRow label="Total Acquisition" value={acquisition.total} isTotal />

                    <TableRow className="bg-slate-800/50"><TableCell colSpan={2} className="font-bold text-orange-300">Rehab</TableCell></TableRow>
                    <CostRow label="Base Budget" value={rehab.baseRehab} />
                    <CostRow label="Contingency & Permits" value={rehab.contingency + rehab.permitFees} />
                    <CostRow label="Total Rehab" value={rehab.total} isTotal />
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Calculator className="w-5 h-5 text-gold-400"/> Holding & Selling</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent"><TableHead>Item</TableHead><TableHead className="text-right">Cost</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="bg-slate-800/50"><TableCell colSpan={2} className="font-bold text-purple-300">Holding</TableCell></TableRow>
                    <CostRow label="Total Soft Costs" value={holding.totalSoft} />
                    <CostRow label="Total Holding" value={holding.total} isTotal />

                    <TableRow className="bg-slate-800/50"><TableCell colSpan={2} className="font-bold text-green-300">Selling</TableCell></TableRow>
                    <CostRow label="Commissions" value={selling.realtorCommission} />
                    <CostRow label="Closing & Mktg" value={selling.closingCostsSelling + selling.marketing + selling.staging} />
                    <CostRow label="Total Selling" value={selling.total} isTotal />
                </TableBody>
            </Table>

            <div className="mt-8 bg-slate-800 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Total Project Cost</span>
                    <span className="text-xl font-bold text-white">${totalProjectCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Cash Required</span>
                    <span className="text-xl font-bold text-gold-400">${totalCashInvested.toLocaleString()}</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostBreakdownCalculator;
