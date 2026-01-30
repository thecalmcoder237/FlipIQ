
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Bed, Bath, Maximize, Calendar, RefreshCw, AlertCircle, Car, Layers, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CompsDisplay = ({ comps, loading, onRefresh, source = "AI" }) => {
  if (loading && !comps) {
    return (
      <div className="bg-card backdrop-blur-xl rounded-xl shadow-sm p-12 border border-border text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-foreground text-lg">Analyzing market & finding comparables...</p>
      </div>
    );
  }

  if (!comps || comps.length === 0) {
    return (
       <div className="bg-card rounded-xl p-12 border border-border text-center shadow-sm">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Comparables Found</h3>
          <p className="text-muted-foreground mb-6">Could not find sufficient recent sales data.</p>
          <Button onClick={onRefresh} variant="outline" className="border-primary text-primary hover:bg-primary/10">
             Try Again
          </Button>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
         <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Home className="text-primary" /> Recent Comparable Sales
         </h2>
         <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded border border-border">Source: {source}</span>
            <Button 
                size="sm" 
                variant="ghost" 
                onClick={onRefresh} 
                disabled={loading}
                className="text-muted-foreground hover:text-foreground"
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
            className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 group shadow-sm"
          >
            <div className="p-5">
               <div className="flex justify-between items-start mb-3">
                  <div>
                     <h3 className="font-bold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {comp.address}
                     </h3>
                     <p className="text-xs text-muted-foreground">{comp.saleDate ? `Sold: ${comp.saleDate}` : 'Recently Sold'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-lg font-bold text-foreground">${comp.salePrice?.toLocaleString() || comp.price?.toLocaleString()}</p>
                     <p className="text-xs text-muted-foreground">${Math.round((comp.salePrice || comp.price) / (comp.sqft || 1))} / sqft</p>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-border mb-3">
                  <div className="text-center">
                     <span className="block text-muted-foreground text-xs flex justify-center items-center gap-1"><Bed size={12}/> Bed</span>
                     <span className="text-foreground font-bold">{comp.beds || comp.bedrooms}</span>
                  </div>
                  <div className="text-center border-l border-border">
                     <span className="block text-muted-foreground text-xs flex justify-center items-center gap-1"><Bath size={12}/> Bath</span>
                     <span className="text-foreground font-bold">{comp.baths || comp.bathrooms}</span>
                  </div>
                  <div className="text-center border-l border-border">
                     <span className="block text-muted-foreground text-xs flex justify-center items-center gap-1"><Maximize size={12}/> Sqft</span>
                     <span className="text-foreground font-bold">{comp.sqft}</span>
                  </div>
               </div>

               {(comp.basement || comp.basementType || comp.parkingType || comp.parkingSpaces != null || comp.levels != null) && (
                 <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                   {comp.basementType && (
                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground" title="Basement type">
                       <Warehouse size={10}/> {comp.basementType}
                     </span>
                   )}
                   {comp.basementCondition && !comp.basementType && (
                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground">Basement: {comp.basementCondition}</span>
                   )}
                   {(comp.parkingType || comp.parkingSpaces != null) && (
                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground" title="Parking">
                       <Car size={10}/> {[comp.parkingType, comp.parkingSpaces != null ? String(comp.parkingSpaces) + ' space(s)' : null].filter(Boolean).join(' · ') || 'Parking'}
                     </span>
                   )}
                   {comp.levels != null && (
                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground" title="Levels">
                       <Layers size={10}/> {comp.levels} level(s)
                     </span>
                   )}
                 </div>
               )}
               
               <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
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
