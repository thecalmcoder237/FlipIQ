
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Eye, Edit, Trash2, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';
import { dealService } from '@/services/dealService';

const DealHistory = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [viewFilter, setViewFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      fetchDeals();
    }
  }, [currentUser]);

  const fetchDeals = async () => {
    try {
      const data = await dealService.loadUserDeals(currentUser.id);
      setDeals(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching deals",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this deal?")) return;

    try {
      await dealService.deleteDeal(id, currentUser.id);
      setDeals(deals.filter(d => d.id !== id));
      toast({ title: "Deal deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  const toggleFavorite = async (deal) => {
    try {
      const updatedDeal = { ...deal, isFavorite: !deal.isFavorite };
      await dealService.saveDeal(updatedDeal, currentUser.id);
      setDeals(deals.map(d => d.id === deal.id ? updatedDeal : d));
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Update failed", description: "Could not update favorite status." });
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filter === 'All' 
      ? true 
      : filter === 'Favorites' 
        ? deal.isFavorite 
        : deal.status === filter;
    
    // Client-side view filter (though service fetches based on permission usually)
    const matchesView = viewFilter === 'All' ? true : deal.userId === currentUser?.id;

    return matchesSearch && matchesStatus && matchesView;
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <Helmet>
        <title>Deal History | FlipIQ</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto">
        <Breadcrumb />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Deal History</h1>
          <Button onClick={() => navigate('/deal-input')} className="bg-blue-600 text-white font-bold hover:bg-blue-700">
            + New Deal
          </Button>
        </div>

        <div className="flex flex-col gap-4 mb-6">
            <div className="flex bg-white p-1 rounded-lg w-fit border border-gray-200 shadow-sm">
                <button
                    onClick={() => setViewFilter('All')}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${viewFilter === 'All' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    All Deals
                </button>
                 <button
                    onClick={() => setViewFilter('Mine')}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${viewFilter === 'Mine' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    My Deals Only
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                type="text"
                placeholder="Search by address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {['All', 'Favorites', 'Analyzing', 'Under Contract', 'Completed'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    filter === f 
                        ? 'bg-gold-500 text-slate-900 font-bold' 
                        : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-300'
                    }`}
                >
                    {f}
                </button>
                ))}
            </div>
            </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading deals...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-20 bg-gray-100 rounded-2xl border border-gray-200">
            <p className="text-gray-400 mb-4">No deals found matching your criteria.</p>
            <Button onClick={() => navigate('/deal-input')} variant="outline" className="text-gold-400 border-gold-400 hover:bg-gold-400/10">
              Analyze a new deal
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDeals.map((deal, idx) => {
              const metrics = calculateDealMetrics(deal);
              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-all shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{deal.address}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          deal.status === 'Completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                          deal.status === 'Under Contract' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {deal.status || 'Analyzing'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400 items-center">
                         <span>Created: {new Date(deal.createdAt).toLocaleDateString()}</span>
                         <span>Profit: <span className={metrics.netProfit >= 0 ? "text-green-400" : "text-red-400"}>${Math.round(metrics.netProfit).toLocaleString()}</span></span>
                         <span className="hidden sm:inline">ROI: {metrics.roi.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(deal)}
                        className="text-gray-400 hover:text-gold-400"
                      >
                         <Star className={`w-5 h-5 ${deal.isFavorite ? 'fill-gold-400 text-gold-400' : ''}`} />
                      </Button>
                      <Button
                        onClick={() => navigate(`/deal-analysis?id=${deal.id}`)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                      >
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/deal-input?id=${deal.id}&edit=true`)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                         <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(deal.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                         <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealHistory;
