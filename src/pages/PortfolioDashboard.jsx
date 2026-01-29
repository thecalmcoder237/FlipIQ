
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, DollarSign, Activity, Wallet, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';
import { dealService } from '@/services/dealService';

const PortfolioDashboard = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!currentUser) return;
      const data = await dealService.loadUserDeals(currentUser.id);
      setDeals(data || []);
      setLoading(false);
    };
    fetchPortfolio();
  }, [currentUser]);

  const metrics = deals.map(d => calculateDealMetrics(d));
  
  const totalValue = metrics.reduce((acc, m) => acc + m.arv, 0);
  const totalProfit = metrics.reduce((acc, m) => acc + m.netProfit, 0);
  const totalInvested = metrics.reduce((acc, m) => acc + (m.purchasePrice || 0) + (m.rehabCosts || 0), 0);
  const avgROI = metrics.length > 0 ? metrics.reduce((acc, m) => acc + m.roi, 0) / metrics.length : 0;
  
  const dealsByStatus = deals.reduce((acc, deal) => {
    const status = deal.status || 'Analyzing';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted px-4 py-8 sm:px-8">
       <Helmet><title>Portfolio Dashboard | FlipIQ</title></Helmet>
       <div className="max-w-7xl mx-auto">
         <Breadcrumb />
         <h1 className="text-3xl font-bold text-foreground mb-8">Portfolio Dashboard</h1>
         
         {/* KPI Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard label="Total Portfolio Value" value={`$${(totalValue/1000000).toFixed(2)}M`} icon={PieChart} color="text-primary" />
            <KPICard label="Projected Profit" value={`$${totalProfit.toLocaleString()}`} icon={TrendingUp} color="text-green-600" />
            <KPICard label="Total Invested" value={`$${totalInvested.toLocaleString()}`} icon={Wallet} color="text-orange-600" />
            <KPICard label="Average ROI" value={`${avgROI.toFixed(1)}%`} icon={Activity} color="text-purple-600" />
         </div>

         {/* Status Breakdown & Recent Activity */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Status Breakdown */}
            <div className="lg:col-span-1 bg-card rounded-2xl p-6 border border-border shadow-sm">
               <h3 className="text-lg font-bold text-foreground mb-4">Deal Status</h3>
               <div className="space-y-3">
                  {Object.entries(dealsByStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center p-3 bg-muted rounded-lg border border-border">
                       <span className="text-foreground">{status}</span>
                       <span className="font-bold text-foreground bg-primary/10 px-2 py-1 rounded">{count}</span>
                    </div>
                  ))}
                  {deals.length === 0 && <p className="text-muted-foreground text-center">No deals found.</p>}
               </div>
            </div>

            {/* Top Performers */}
            <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm">
               <h3 className="text-lg font-bold text-foreground mb-4">Top Opportunities (by Profit)</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead>
                     <tr className="text-muted-foreground border-b border-border">
                       <th className="pb-3 pl-2">Address</th>
                       <th className="pb-3">Status</th>
                       <th className="pb-3 text-right">Profit</th>
                       <th className="pb-3 text-right pr-2">ROI</th>
                     </tr>
                   </thead>
                   <tbody>
                     {metrics.sort((a,b) => b.netProfit - a.netProfit).slice(0, 5).map((m, i) => {
                       const originalDeal = deals.find(d => d.address === m.address);
                       return (
                        <tr key={i} className="border-b border-border hover:bg-muted transition-colors">
                          <td className="py-3 pl-2 text-foreground font-medium">{originalDeal?.address || 'Unknown'}</td>
                          <td className="py-3 text-muted-foreground">{originalDeal?.status || 'Analyzing'}</td>
                          <td className="py-3 text-right text-green-600 font-bold">${m.netProfit.toLocaleString()}</td>
                          <td className="py-3 text-right pr-2 text-primary">{m.roi.toFixed(1)}%</td>
                        </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};

const KPICard = ({ label, value, icon: Icon, color }) => (
  <motion.div whileHover={{ y: -5 }} className="bg-card p-6 rounded-2xl border border-border shadow-sm">
     <div className="flex justify-between items-start mb-4">
       <div className={`p-3 rounded-xl bg-gray-100 ${color}`}>
         <Icon className="w-6 h-6" />
       </div>
     </div>
     <h4 className="text-muted-foreground text-sm mb-1">{label}</h4>
     <p className={`text-2xl font-bold text-foreground`}>{value}</p>
  </motion.div>
);

export default PortfolioDashboard;
