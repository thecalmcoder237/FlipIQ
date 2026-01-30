
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
    <div className="min-h-screen bg-muted px-4 py-8 sm:px-8">
      <Helmet>
        <title>Deal History | FlipIQ</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto">
        <Breadcrumb />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-foreground">Deal History</h1>
          <Button onClick={() => navigate('/deal-input')} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
            + New Deal
          </Button>
        </div>

        <div className="flex flex-col gap-4 mb-6">
            <div className="flex bg-card p-1 rounded-lg w-fit border border-border shadow-sm">
                <button
                    onClick={() => setViewFilter('All')}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${viewFilter === 'All' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    All Deals
                </button>
                 <button
                    onClick={() => setViewFilter('Mine')}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${viewFilter === 'Mine' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    My Deals Only
                </button>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                type="text"
                placeholder="Search by address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {['All', 'Favorites', 'Analyzing', 'Under Contract', 'Completed'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    filter === f 
                        ? 'bg-primary text-primary-foreground font-bold' 
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border'
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
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading deals...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-20 bg-muted rounded-2xl border border-border">
            <p className="text-muted-foreground mb-4">No deals found matching your criteria.</p>
            <Button onClick={() => navigate('/deal-input')} variant="outline" className="text-primary border-primary hover:bg-primary/10">
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
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary transition-all shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-foreground">{deal.address}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          deal.status === 'Completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                          deal.status === 'Under Contract' ? 'bg-accentBrand/20 text-accentBrand border-accentBrand/30' :
                          'bg-primary/20 text-primary border-primary/30'
                        }`}>
                          {deal.status || 'Analyzing'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground items-center">
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
                        className="text-muted-foreground hover:text-primary"
                      >
                         <Star className={`w-5 h-5 ${deal.isFavorite ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                      <Button
                        onClick={() => navigate(`/deal-analysis?id=${deal.id}`)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                      >
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/deal-input?id=${deal.id}&edit=true`)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                         <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(deal.id)}
                        className="text-muted-foreground hover:text-destructive"
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
