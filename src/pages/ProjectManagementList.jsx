import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Hammer,
  MapPin,
  ArrowRight,
  Plus,
  Loader2,
  ClipboardList,
  DollarSign,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dealService } from '@/services/dealService';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const ACTIVE_REHAB_STATUSES = ['Funded', 'Closed', 'Completed'];

function isActiveRehab(deal) {
  return (
    ACTIVE_REHAB_STATUSES.includes(deal.status) ||
    deal.isFunded === true ||
    deal.isClosed === true
  );
}

function formatCurrency(n) {
  if (!n) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

const StatusBadge = ({ status }) => {
  const cfg = {
    Funded: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Closed: 'bg-green-500/20 text-green-400 border-green-500/30',
    Completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status}
    </span>
  );
};

const DealCard = ({ deal, metrics, onClick }) => {
  const rehabBudget = deal.rehabCosts || deal.rehabBudget || metrics?.rehabCosts || 0;
  const purchasePrice = deal.purchasePrice || metrics?.purchasePrice || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer group"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={deal.status} />
                {deal.isFunded && deal.status !== 'Funded' && (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30 font-medium">
                    Funded
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-base truncate mt-1">
                {deal.address || 'Unknown address'}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {[deal.city, deal.county].filter(Boolean).join(', ') || 'Location not set'}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Purchase</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(purchasePrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Rehab Budget</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(rehabBudget)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Net Profit</p>
              <p className={`text-sm font-semibold ${(metrics?.netProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(metrics?.netProfit ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ProjectManagementList = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const all = await dealService.loadAllDeals();
        setDeals((all || []).filter(isActiveRehab));
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error loading deals', description: e.message });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser]);

  const dealsWithMetrics = deals.map((d) => ({ deal: d, metrics: calculateDealMetrics(d) }));

  const stats = {
    total: deals.length,
    funded: deals.filter((d) => d.status === 'Funded' || d.isFunded).length,
    closed: deals.filter((d) => d.status === 'Closed' || d.isClosed).length,
    completed: deals.filter((d) => d.status === 'Completed').length,
  };

  return (
    <>
      <Helmet>
        <title>Rehab Projects - FlipIQ</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Rehab Projects' },
            ]}
          />

          {/* Header */}
          <div className="flex items-start justify-between mt-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-accentBrand/10 rounded-xl">
                  <Hammer className="w-6 h-6 text-accentBrand" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Rehab Projects</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                Active rehab deals — track tasks, budget, materials, and progress.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/deal-history')}
              className="hidden sm:flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              All Deals
            </Button>
          </div>

          {/* Stats row */}
          {!loading && deals.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Active Projects', value: stats.total, icon: Hammer, color: 'text-accentBrand' },
                { label: 'Funded', value: stats.funded, icon: DollarSign, color: 'text-blue-400' },
                { label: 'Closed', value: stats.closed, icon: TrendingUp, color: 'text-green-400' },
                { label: 'Completed', value: stats.completed, icon: Calendar, color: 'text-emerald-400' },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <div className="flex items-center gap-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : deals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Hammer className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No active rehab projects</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                Mark a deal as <strong>Funded</strong> or <strong>Closed</strong> in Deal Analysis to see it here.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/deal-input')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Deal
                </Button>
                <Button variant="outline" onClick={() => navigate('/deal-history')} className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  View Deal History
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {dealsWithMetrics.map(({ deal, metrics }) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  metrics={metrics}
                  onClick={() => navigate(`/project-management/deal?id=${deal.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectManagementList;
