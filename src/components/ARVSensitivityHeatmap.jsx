import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { calculateDealMetrics } from '@/utils/dealCalculations';

const ARVSensitivityHeatmap = ({ deal, metrics }) => {
  const sensitivityData = useMemo(() => {
    if (!deal || !metrics) return [];
    
    const baseARV = Number(deal.arv) || 0;
    const changes = [-10, -5, 0, 5, 10];
    
    return changes.map(change => {
      const adjustedARV = baseARV * (1 + change / 100);
      const adjustedDeal = { ...deal, arv: adjustedARV };
      const adjustedMetrics = calculateDealMetrics(adjustedDeal);
      
      const netProfit = adjustedMetrics?.netProfit || 0;
      const roi = adjustedMetrics?.roi || 0;
      const isProfitable = netProfit > 0;
      
      // Color determination
      let color = '#ef4444'; // Red for loss
      if (netProfit > 30000) color = '#10b981'; // Green for strong
      else if (netProfit > 15000) color = '#84cc16'; // Light green
      else if (netProfit > 0) color = '#f59e0b'; // Yellow/Amber
      
      return {
        arvChange: change,
        arvChangeLabel: change >= 0 ? `+${change}%` : `${change}%`,
        netProfit,
        roi: roi.toFixed(1),
        isProfitable,
        color,
        adjustedARV
      };
    });
  }, [deal, metrics]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-bold text-gray-900 mb-2">ARV Change: {data.arvChangeLabel}</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">Adjusted ARV: <span className="font-bold text-gray-900">${data.adjustedARV.toLocaleString()}</span></p>
            <p className="text-gray-600">Net Profit: <span className={`font-bold ${data.isProfitable ? 'text-green-600' : 'text-red-600'}`}>${data.netProfit.toLocaleString()}</span></p>
            <p className="text-gray-600">ROI: <span className={`font-bold ${data.isProfitable ? 'text-green-600' : 'text-red-600'}`}>{data.roi}%</span></p>
            <p className="text-gray-600">Status: {data.isProfitable ? <span className="text-green-600">✅ Profitable</span> : <span className="text-red-600">❌ Loss</span>}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-blue-600" />
          ARV Sensitivity Heatmap
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">How fragile is your profit to ARV changes?</p>
      </CardHeader>
      <CardContent>
        {/* Interactive Bar Chart */}
        <div className="h-64 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sensitivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="arvChangeLabel" 
                stroke="#6b7280" 
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `$${value/1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                {sensitivityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-700 font-medium">ARV Change</th>
                <th className="text-right py-2 px-3 text-gray-700 font-medium">Net Profit</th>
                <th className="text-right py-2 px-3 text-gray-700 font-medium">ROI</th>
                <th className="text-center py-2 px-3 text-gray-700 font-medium">Profitable?</th>
              </tr>
            </thead>
            <tbody>
              {sensitivityData.map((row, idx) => (
                <tr 
                  key={idx}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-2 px-3 text-gray-900 font-medium">{row.arvChangeLabel}</td>
                  <td className={`py-2 px-3 text-right font-mono ${row.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    ${row.netProfit.toLocaleString()}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${row.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    {row.roi}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    {row.isProfitable ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-200">
            💡 <strong>Threshold Analysis:</strong> Your deal remains profitable even with a {Math.abs(sensitivityData.find(r => !r.isProfitable)?.arvChange || -10)}% ARV drop, 
            showing {sensitivityData.filter(r => r.isProfitable).length === sensitivityData.length ? 'strong' : 'moderate'} resilience to market fluctuations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ARVSensitivityHeatmap;
