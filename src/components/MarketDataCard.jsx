
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, Users, Shield, Calendar, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MarketDataCard = ({ marketData, deal }) => {
  if (!marketData) return (
     <div className="bg-slate-900/50 border border-white/10 rounded-xl p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-600 mb-4" />
        <h3 className="text-white font-bold text-lg">Market Intelligence Unavailable</h3>
        <p className="text-gray-400 mt-2">Generate AI analysis to unlock market insights.</p>
     </div>
  );

  // Mock trend data if not provided (usually would come from API)
  const trendData = [
    { month: 'Jan', price: 280 },
    { month: 'Feb', price: 285 },
    { month: 'Mar', price: 292 },
    { month: 'Apr', price: 290 },
    { month: 'May', price: 298 },
    { month: 'Jun', price: 305 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl mb-6"
    >
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-800/50">
         <div className="flex items-center gap-2 mb-1">
            <MapPin className="text-gold-400 w-5 h-5" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
               {deal.zip_code || "Market"} Intelligence
            </h2>
         </div>
         <p className="text-xs text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Last Updated: {marketData.timestamp ? new Date(marketData.timestamp).toLocaleDateString() : 'Just Now'}
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
         {/* Left: Stats Grid */}
         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <StatBox label="Market Trend" value={marketData.trend || "Stable"} color="text-green-400" />
               <StatBox label="Avg DOM" value={`${marketData.avgDom || 35} Days`} color="text-blue-400" />
               <StatBox label="Inventory" value={marketData.inventory || "Low"} color="text-orange-400" />
               <StatBox label="Appreciation" value={marketData.appreciation || "+3.5%"} color="text-purple-400" />
            </div>
            
            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
               <h3 className="text-xs uppercase text-gray-500 font-bold mb-3">Price History Trend</h3>
               <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={trendData}>
                        <defs>
                           <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <Tooltip 
                           contentStyle={{backgroundColor: '#0f172a', border: '1px solid #333', color: '#fff'}}
                           itemStyle={{color: '#fbbf24'}}
                        />
                        <Area type="monotone" dataKey="price" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPrice)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* Right: Comparative Analysis */}
         <div className="space-y-4">
            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
               <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Shield size={16} className="text-blue-400"/> Area Rating
               </h3>
               <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">School District</span>
                  <div className="flex gap-1">
                     {[1,2,3,4,5].map(i => <div key={i} className={`w-6 h-1 rounded-full ${i <= 4 ? 'bg-green-500' : 'bg-slate-700'}`}></div>)}
                  </div>
               </div>
               <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Crime Safety</span>
                  <div className="flex gap-1">
                     {[1,2,3,4,5].map(i => <div key={i} className={`w-6 h-1 rounded-full ${i <= 3 ? 'bg-yellow-500' : 'bg-slate-700'}`}></div>)}
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Walkability</span>
                  <div className="flex gap-1">
                     {[1,2,3,4,5].map(i => <div key={i} className={`w-6 h-1 rounded-full ${i <= 2 ? 'bg-red-500' : 'bg-slate-700'}`}></div>)}
                  </div>
               </div>
            </div>

            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
               <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Users size={16} className="text-purple-400"/> Demographics
               </h3>
               <p className="text-sm text-gray-400 leading-relaxed">
                  {marketData.demographics || "Area populated by young professionals and first-time homebuyers. High demand for renovated starter homes."}
               </p>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

const StatBox = ({ label, value, color }) => (
   <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5 text-center">
      <p className="text-xs text-gray-500 uppercase font-bold">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
   </div>
);

export default MarketDataCard;
