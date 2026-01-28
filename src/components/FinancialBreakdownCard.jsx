
import React from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  CartesianGrid 
} from 'recharts';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FinancialBreakdownCard = ({ deal, metrics, qualityScore }) => {
  if (!deal || !metrics) return null;

  // Use the new granular metrics structure
  const { acquisition, hardMoney, rehab, holding, selling, totalProjectCost, grossProfit, netProfit, roi } = metrics;
  
  // Prepare data for Pie Chart
  const costData = [
    { name: 'Purchase Price', value: metrics.purchasePrice || 0, color: '#6366f1' },
    { name: 'Acq. Fees', value: acquisition.feesOnly || 0, color: '#818cf8' },
    { name: 'Rehab', value: rehab.total || 0, color: '#f59e0b' },
    { name: 'Holding', value: holding.total + hardMoney.total, color: '#ef4444' }, // Combine Soft + Interest
    { name: 'Selling', value: selling.total || 0, color: '#ec4899' },
  ].filter(item => item.value > 0);

  const profitWaterfallData = [
    { name: 'ARV', amount: metrics.arv || 0, fill: '#10b981' },
    { name: 'Project Cost', amount: totalProjectCost || 0, fill: '#ef4444' },
    { name: 'Selling', amount: selling.total || 0, fill: '#ec4899' },
    { name: 'Net Profit', amount: netProfit || 0, fill: netProfit > 0 ? '#fbbf24' : '#991b1b' },
  ];

  const renderCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-white mb-1">{label || payload[0].name}</p>
          <p className="text-gold-400 font-mono text-sm">
            ${(payload[0].value || payload[0].payload.amount || 0).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl mb-8"
    >
      <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-gold-400" /> Financial Dashboard
          </h2>
          <p className="text-gray-400 text-sm">Comprehensive breakdown of project economics</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cost Allocation Pie */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-blue-400" /> Capital Allocation
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.2)" />
                  ))}
                </Pie>
                <Tooltip content={renderCustomTooltip} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '10px', color: '#ccc'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Waterfall */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
             <TrendingUp size={16} className="text-green-400" /> Value Creation
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitWaterfallData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip content={renderCustomTooltip} cursor={{fill: 'transparent'}} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {profitWaterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-4">
           <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 flex justify-between items-center">
             <div>
               <p className="text-gray-400 text-xs">Net Profit</p>
               <p className={`text-2xl font-bold ${netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>${netProfit.toLocaleString()}</p>
             </div>
             <DollarSign className="text-green-500/50" size={32} />
           </div>
           
           <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 flex justify-between items-center">
             <div>
               <p className="text-gray-400 text-xs">ROI</p>
               <p className={`text-2xl font-bold ${roi > 10 ? 'text-blue-400' : 'text-yellow-400'}`}>{roi.toFixed(1)}%</p>
             </div>
             <Activity className="text-blue-500/50" size={32} />
           </div>

           <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 flex justify-between items-center">
             <div>
               <p className="text-gray-400 text-xs">Gross Profit</p>
               <p className="text-2xl font-bold text-yellow-400">${grossProfit.toLocaleString()}</p>
             </div>
             <TrendingUp className="text-yellow-500/50" size={32} />
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinancialBreakdownCard;
