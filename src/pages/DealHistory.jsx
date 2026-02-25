import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Search, Eye, Edit, Trash2, Star, Tag, BarChart3, Send, CheckCircle2, CalendarDays, Filter, Calendar, User, ArrowDown, ArrowUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';
import { dealService } from '@/services/dealService';
import { getProfiles } from '@/services/profileService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_FILTER_OPTIONS = ['All', 'Favorites', 'Analyzing', 'Under Contract', 'Offer Sent', 'Funded', 'Closed', 'Completed', 'Passed'];

function getDealCountsByPeriod(deals) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let daily = 0;
  let weekly = 0;
  let monthly = 0;
  deals.forEach((deal) => {
    const created = deal.createdAt ? new Date(deal.createdAt) : null;
    if (!created) return;
    if (created >= startOfToday) daily++;
    if (created >= sevenDaysAgo) weekly++;
    if (created >= startOfMonth) monthly++;
  });
  return { daily, weekly, monthly };
}

const DealHistory = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [viewFilter, setViewFilter] = useState('All');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const profileByUserId = useMemo(() => {
    const map = {};
    profiles.forEach((p) => { map[p.id] = p; });
    return map;
  }, [profiles]);

  const dashboardCounts = useMemo(() => {
    const period = getDealCountsByPeriod(deals);
    const offersSent = deals.filter((d) => d.status === 'Offer Sent').length;
    const closed = deals.filter((d) => d.status === 'Closed' || d.status === 'Completed' || d.isClosed === true).length;
    return { ...period, offersSent, closed };
  }, [deals]);

  useEffect(() => {
    if (viewFilter === 'All') {
      getProfiles().then(setProfiles).catch(() => setProfiles([]));
    } else {
      setSortBy('date');
    }
  }, [viewFilter]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const load = () => {
      if (viewFilter === 'Mine') {
        return dealService.loadUserDeals(currentUser.id);
      }
      if (selectedUserFilter === 'all') {
        return dealService.loadAllDeals();
      }
      return dealService.loadUserDeals(selectedUserFilter);
    };
    load()
      .then((data) => setDeals(data || []))
      .catch((err) => {
        toast({
          variant: 'destructive',
          title: 'Error fetching deals',
          description: err.message,
        });
      })
      .finally(() => setLoading(false));
  }, [currentUser, viewFilter, selectedUserFilter, toast]);

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
  
  const isDealOwner = (deal) => (deal?.userId ?? deal?.user_id) === currentUser?.id;
  const canManageDeal = (deal) => isDealOwner(deal) || isAdmin;

  const toggleFavorite = async (deal) => {
    if (!canManageDeal(deal)) return;
    try {
      const updatedDeal = { ...deal, isFavorite: !deal.isFavorite };
      await dealService.saveDeal(updatedDeal, currentUser.id);
      setDeals(deals.map(d => d.id === deal.id ? updatedDeal : d));
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Update failed", description: "Could not update favorite status." });
    }
  };

  const handleStatusChange = async (deal, newStatus) => {
    if (!canManageDeal(deal)) return;
    try {
      const saved = await dealService.updateDealFields(deal.id, { status: newStatus }, currentUser.id);
      setDeals(deals.map(d => d.id === deal.id ? saved : d));
      toast({ title: "Status updated", description: `"${deal.address}" marked as ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    }
  };

  const filteredDeals = useMemo(() => deals.filter((deal) => {
    const matchesSearch = (deal.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filter === 'All' ? true : filter === 'Favorites' ? deal.isFavorite : deal.status === filter;
    return matchesSearch && matchesStatus;
  }), [deals, searchTerm, filter]);

  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];
    if (sortBy === 'date') {
      list.sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt).getTime();
        const tb = new Date(b.updatedAt || b.createdAt).getTime();
        return sortOrder === 'desc' ? tb - ta : ta - tb;
      });
    } else {
      list.sort((a, b) => {
        const nameA = (profileByUserId[a.userId]?.displayName || profileByUserId[a.userId]?.email || '').toLowerCase();
        const nameB = (profileByUserId[b.userId]?.displayName || profileByUserId[b.userId]?.email || '').toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }
    return list;
  }, [filteredDeals, sortBy, sortOrder, profileByUserId]);

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

        {!loading && deals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 min-[500px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6"
          >
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -translate-y-2 translate-x-2 group-hover:bg-primary/10 transition-colors" aria-hidden />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Deals analyzed</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-lg sm:text-xl font-bold tabular-nums text-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      Daily <span className="text-primary">{dashboardCounts.daily}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      Weekly <span className="text-primary">{dashboardCounts.weekly}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      Monthly <span className="text-primary">{dashboardCounts.monthly}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accentBrand/5 rounded-bl-full -translate-y-2 translate-x-2 group-hover:bg-accentBrand/10 transition-colors" aria-hidden />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accentBrand/10 text-accentBrand">
                  <Send className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Offers sent</p>
                  <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{dashboardCounts.offersSent}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group min-[500px]:col-span-2 xl:col-span-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full -translate-y-2 translate-x-2 group-hover:bg-green-500/10 transition-colors" aria-hidden />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Closed</p>
                  <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{dashboardCounts.closed}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-card p-1 rounded-lg w-fit border border-border shadow-sm">
                <button
                  onClick={() => setViewFilter('Mine')}
                  className={`px-4 py-2 rounded-md text-sm transition-all ${viewFilter === 'Mine' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  My Deals
                </button>
                <button
                  onClick={() => setViewFilter('All')}
                  className={`px-4 py-2 rounded-md text-sm transition-all ${viewFilter === 'All' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  All Deals
                </button>
              </div>
              {viewFilter === 'All' && (
                <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                  <SelectTrigger className="w-[220px] bg-card border-border">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName || p.email || p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 shrink-0" />
                <input
                type="text"
                placeholder="Search by address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-10 bg-card border-border shrink-0 gap-2">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider>
              <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-background/50 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={sortBy === 'date' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setSortBy('date')}
                      aria-label="Sort by date"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by date</TooltipContent>
                </Tooltip>
                {viewFilter === 'All' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={sortBy === 'user' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setSortBy('user')}
                        aria-label="Sort by user"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sort by user</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                      aria-label={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                    >
                      {sortOrder === 'desc' ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {sortOrder === 'desc' ? (sortBy === 'date' ? 'Newest first' : 'Z–A') : (sortBy === 'date' ? 'Oldest first' : 'A–Z')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading deals...</p>
          </div>
        ) : sortedDeals.length === 0 ? (
          <div className="text-center py-20 bg-muted rounded-2xl border border-border">
            <p className="text-muted-foreground mb-4">No deals found matching your criteria.</p>
            <Button onClick={() => navigate('/deal-input')} variant="outline" className="text-primary border-primary hover:bg-primary/10">
              Analyze a new deal
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedDeals.map((deal, idx) => {
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
                          deal.status === 'Completed' || deal.status === 'Closed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                          deal.status === 'Under Contract' || deal.status === 'Funded' || deal.status === 'Offer Sent' ? 'bg-accentBrand/20 text-accentBrand border-accentBrand/30' :
                          deal.status === 'Passed' ? 'bg-muted text-muted-foreground border-border' :
                          'bg-primary/20 text-primary border-primary/30'
                        }`}>
                          {deal.status || 'Analyzing'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground items-center">
                        <span>Created: {new Date(deal.createdAt).toLocaleDateString()}</span>
                        <span>Profit: <span className={metrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>${Math.round(metrics.netProfit).toLocaleString()}</span></span>
                        <span className="hidden sm:inline">ROI: {metrics.roi.toFixed(1)}%</span>
                        {viewFilter === 'All' && deal.userId && (
                          <span className="text-muted-foreground/80">
                            Owner: {profileByUserId[deal.userId]?.email || profileByUserId[deal.userId]?.displayName || '—'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManageDeal(deal) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(deal)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Star className={`w-5 h-5 ${deal.isFavorite ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                      )}
                      <Button
                        onClick={() => navigate(`/deal-analysis?id=${deal.id}`)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                      >
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                      {canManageDeal(deal) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit inputs"
                            onClick={() => navigate(`/deal-input?id=${deal.id}&edit=true`)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Select
                            value={deal.status || 'Analyzing'}
                            onValueChange={(val) => handleStatusChange(deal, val)}
                          >
                            <SelectTrigger
                              className="h-8 w-auto gap-1.5 px-2.5 border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent focus:ring-0 focus:ring-offset-0"
                              title="Change deal status"
                            >
                              <Tag className="w-3.5 h-3.5 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end" className="bg-card border-border text-foreground">
                              <SelectItem value="Analyzing">Analyzing</SelectItem>
                              <SelectItem value="Under Contract">Under Contract</SelectItem>
                              <SelectItem value="Offer Sent">Offer Sent</SelectItem>
                              <SelectItem value="Funded">Funded</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Passed">Passed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(deal.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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
