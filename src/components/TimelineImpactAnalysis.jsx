
import React from 'react';
import { calculateTimelineProjections } from '@/utils/advancedDealCalculations';
import { Clock } from 'lucide-react';

const TimelineImpactAnalysis = ({ deal, metrics }) => {
  const projections = calculateTimelineProjections(deal, metrics);

  // Find max profit to scale the chart
  const maxProfit = Math.max(...projections.map(p => p.profit));
  const minProfit = Math.min(...projections.map(p => p.profit));
  const range = maxProfit - minProfit;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold text-white">Timeline Profit Impact</h3>
      </div>

      <div className="relative h-48 w-full mt-8 mb-4">
        {/* Simple SVG Chart */}
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Zero Line */}
          {minProfit < 0 && maxProfit > 0 && (
            <line
              x1="0"
              y1={maxProfit / range * 100 + "%"}
              x2="100%"
              y2={maxProfit / range * 100 + "%"}
              stroke="#4b5563"
              strokeDasharray="4"
            />
          )}

          {/* Points and Lines */}
          <polyline
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            points={projections.map((p, i) => {
              const x = (i / (projections.length - 1)) * 100;
              const y = 100 - ((p.profit - minProfit) / range * 100);
              return `${x}%,${y}%`;
            }).join(' ')}
          />

          {projections.map((p, i) => {
            const x = (i / (projections.length - 1)) * 100;
            const y = 100 - ((p.profit - minProfit) / range * 100);
            return (
              <g key={i}>
                <circle cx={`${x}%`} cy={`${y}%`} r="6" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
                <text x={`${x}%`} y={`${y}%`} dy="-15" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  ${(p.profit / 1000).toFixed(0)}k
                </text>
                <text x={`${x}%`} y="100%" dy="20" textAnchor="middle" fill="#9ca3af" fontSize="12">
                  {p.month}mo
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      <p className="text-center text-sm text-gray-400 mt-8">
        Holding longer drastically reduces profit due to carrying costs and potential market staleness.
      </p>
    </div>
  );
};

export default TimelineImpactAnalysis;
