import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Scale, Clock, DollarSign, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const DealHealthRadar = ({ deal, metrics, propertyIntelligence }) => {
  const radarData = useMemo(() => {
    if (!deal || !metrics) return [];

    // 1. Profitability (0-100): Based on Net Profit and ROI
    const profitability = Math.min(100, Math.max(0, 
      (metrics.netProfit > 0 ? 50 : 0) + 
      (metrics.roi > 0 ? Math.min(50, (metrics.roi / 30) * 50) : 0)
    ));

    // 2. Risk (0-100, lower = better): Rehab overrun risk + market volatility
    const rehabOverrunRisk = Math.min(50, (deal.rehabOverrunPercent || 0) * 2);
    const marketVolatility = 20; // Placeholder - could be calculated from market data
    const risk = Math.min(100, rehabOverrunRisk + marketVolatility);

    // 3. Timeline (0-100): Project duration vs market avg DOM
    const holdingMonths = deal.holdingMonths || 6;
    const avgDOM = 60; // Placeholder - should come from market data
    const timelineScore = Math.max(0, 100 - ((holdingMonths * 30 - avgDOM) / avgDOM) * 100);
    const timeline = Math.min(100, Math.max(0, timelineScore));

    // 4. Cash Efficiency (0-100): Cash-on-Cash Return
    const cashInvested = (metrics.acquisition?.total || 0) + (metrics.rehab?.total || 0);
    const cashOnCash = cashInvested > 0 ? (metrics.netProfit / cashInvested) * 100 : 0;
    const cashEfficiency = Math.min(100, Math.max(0, (cashOnCash / 50) * 100));

    // 5. Market Fit (0-100): ZIP hotness + property type match
    const marketFit = 75; // Placeholder - should come from property intelligence

    return [
      { axis: 'Profitability', value: Math.round(profitability), icon: TrendingUp },
      { axis: 'Risk', value: Math.round(100 - risk), icon: Scale }, // Inverted (lower risk = higher score)
      { axis: 'Timeline', value: Math.round(timeline), icon: Clock },
      { axis: 'Cash Efficiency', value: Math.round(cashEfficiency), icon: DollarSign },
      { axis: 'Market Fit', value: Math.round(marketFit), icon: MapPin }
    ];
  }, [deal, metrics, propertyIntelligence]);

  const averageScore = useMemo(() => {
    if (radarData.length === 0) return 0;
    return Math.round(radarData.reduce((sum, item) => sum + item.value, 0) / radarData.length);
  }, [radarData]);

  const getScoreColor = (score) => {
    if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300' };
    if (score >= 65) return { text: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300' };
    return { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' };
  };

  const scoreColor = getScoreColor(averageScore);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = getScoreColor(data.value);
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-bold text-gray-900 mb-1">{data.axis}</p>
          <p className={`text-lg font-bold ${color.text}`}>{data.value}/100</p>
        </div>
      );
    }
    return null;
  };

  if (radarData.length === 0) return null;

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Scale className="text-purple-600" />
          Deal Health Radar
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Multi-dimensional health assessment</p>
      </CardHeader>
      <CardContent>
        {/* Average Score */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`${scoreColor.bg} ${scoreColor.border} border rounded-lg p-4 mb-4 text-center`}
        >
          <p className="text-xs text-gray-600 mb-1">Overall Health Score</p>
          <p className={`text-3xl font-bold ${scoreColor.text}`}>{averageScore}/100</p>
          <p className="text-xs text-gray-600 mt-1">
            {averageScore >= 80 && '✅ Strong deal'}
            {averageScore >= 65 && averageScore < 80 && '⚠️ Solid, but monitor risks'}
            {averageScore < 65 && '🚨 High risk - reconsider'}
          </p>
        </motion.div>

        {/* Radar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis 
                dataKey="axis" 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Health Score"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown */}
        <div className="mt-4 space-y-2">
          {radarData.map((item, idx) => {
            const color = getScoreColor(item.value);
            return (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${color.text}`} />
                  <span className="text-xs text-gray-700">{item.axis}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color.bg.replace('/20', '')}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${color.text} w-12 text-right`}>
                    {item.value}/100
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-purple-900">
            💡 <strong>Insight:</strong> Your deal scores {averageScore}/100 — {
              averageScore >= 80 ? 'strong performance across all dimensions' :
              averageScore >= 65 ? 'solid foundation, but ' + (radarData.find(d => d.value < 65)?.axis || 'some areas') + ' needs attention' :
              'multiple risk factors present, consider adjustments'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealHealthRadar;
