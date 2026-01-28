
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Bed, Bath, Maximize, Calendar, RefreshCw, AlertCircle, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CompsDisplay = ({ comps, loading, onRefresh, source = "AI" }) => {
  if (loading && !comps) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl shadow-2xl p-12 border border-white/10 text-center">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Analyzing market & finding comparables...</p>
      </div>
    );
  }

  if (!comps || comps.length === 0) {
    return (
       <div className="bg-slate-900/50 rounded-xl p-12 border border-white/10 text-center">
          <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Comparables Found</h3>
          <p className="text-gray-400 mb-6">Could not find sufficient recent sales data.</p>
          <Button onClick={onRefresh} variant="outline" className="border-gold-500 text-gold-400">
             Try Again
          </Button>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-white/10">
         <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Home className="text-teal-400" /> Recent Comparable Sales
         </h2>
         <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-slate-900 px-2 py-1 rounded border border-white/5">Source: {source}</span>
            <Button 
                size="sm" 
                variant="ghost" 
                onClick={onRefresh} 
                disabled={loading}
                className="text-gray-400 hover:text-white"
            >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comps.map((comp, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-slate-900/80 rounded-xl overflow-hidden border border-white/10 hover:border-gold-500/50 transition-all hover:shadow-lg hover:shadow-gold-500/10 group"
          >
            <div className="p-5">
               <div className="flex justify-between items-start mb-3">
                  <div>
                     <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-gold-400 transition-colors">
                        {comp.address}
                     </h3>
                     <p className="text-xs text-gray-500">{comp.saleDate ? `Sold: ${comp.saleDate}` : 'Recently Sold'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-lg font-bold text-white">${comp.salePrice?.toLocaleString() || comp.price?.toLocaleString()}</p>
                     <p className="text-xs text-gray-400">${Math.round((comp.salePrice || comp.price) / (comp.sqft || 1))} / sqft</p>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2 py-3 border-t border-white/5 border-b mb-3">
                  <div className="text-center">
                     <span className="block text-gray-400 text-xs flex justify-center items-center gap-1"><Bed size={12}/> Bed</span>
                     <span className="text-white font-bold">{comp.beds || comp.bedrooms}</span>
                  </div>
                  <div className="text-center border-l border-white/5">
                     <span className="block text-gray-400 text-xs flex justify-center items-center gap-1"><Bath size={12}/> Bath</span>
                     <span className="text-white font-bold">{comp.baths || comp.bathrooms}</span>
                  </div>
                  <div className="text-center border-l border-white/5">
                     <span className="block text-gray-400 text-xs flex justify-center items-center gap-1"><Maximize size={12}/> Sqft</span>
                     <span className="text-white font-bold">{comp.sqft}</span>
                  </div>
               </div>
               
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                     <Calendar size={12}/> DOM: {comp.dom || comp.daysOnMarket || 'N/A'}
                  </span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CompsDisplay;
