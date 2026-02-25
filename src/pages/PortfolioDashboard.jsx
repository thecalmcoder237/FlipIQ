
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Wallet,
  BarChart3,
  Target,
  FileText,
  Download,
  Eye,
  Layers,
  X,
  Filter,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';
import { dealService } from '@/services/dealService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

const STATUS_OPTIONS = ['All', 'Analyzing', 'Under Contract', 'Offer Sent', 'In Progress', 'Funded', 'Closed', 'Completed', 'Abandoned'];

function formatCompactCurrency(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${Math.round(n / 1e6 * 10) / 10}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
function formatHoldingMonths(m) {
  return Number.isInteger(m) ? `${m}` : m.toFixed(1);
}
function formatRoi(pct) {
  return pct === Math.round(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

const PortfolioDashboard = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterScoreMin, setFilterScoreMin] = useState('');
  const [filterScoreMax, setFilterScoreMax] = useState('');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [showOnlyProfitable, setShowOnlyProfitable] = useState(false);
  const [highlightOverlapping, setHighlightOverlapping] = useState(false);
  const [filterFunded, setFilterFunded] = useState(false);
  const [filterClosed, setFilterClosed] = useState(false);
  const [sortBy, setSortBy] = useState('profit'); // profit | roi | score | date
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSaveFavorite = async (deal) => {
    try {
      const updated = { ...deal, isFavorite: !deal.isFavorite };
      await dealService.saveDeal(updated, currentUser.id);
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, isFavorite: updated.isFavorite } : d)));
      toast({ title: updated.isFavorite ? 'Saved to favorites' : 'Removed from favorites' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update', description: e.message });
    }
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!currentUser) return;
      try {
        const data = await dealService.loadAllDeals();
        setDeals(data || []);
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error loading portfolio', description: e.message });
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [currentUser]);

  const metricsList = useMemo(() => deals.map((d) => ({ deal: d, metrics: calculateDealMetrics(d) })), [deals]);

  // Portfolio Snapshot
  const totalDeals = deals.length;
  const activeDeals = deals.filter((d) => !['Completed', 'Abandoned'].includes(d.status || '')).length;
  const closedProfitable = metricsList.filter(({ deal, metrics }) => (deal.status === 'Completed') && (metrics?.netProfit ?? 0) >= 0);
  const closedUnprofitable = metricsList.filter(({ deal, metrics }) => (deal.status === 'Completed' || deal.status === 'Abandoned') && (metrics?.netProfit ?? 0) < 0);
  const closedProfitableSum = closedProfitable.reduce((acc, { metrics }) => acc + (metrics?.netProfit ?? 0), 0);
  const closedUnprofitableSum = Math.abs(closedUnprofitable.reduce((acc, { metrics }) => acc + (metrics?.netProfit ?? 0), 0));
  const pendingUnderContract = deals.filter((d) => d.status === 'Under Contract').length;
  const fundedCount = deals.filter((d) => d.isFunded || d.status === 'Funded').length;
  const closedCount = deals.filter((d) => d.isClosed || d.status === 'Closed' || d.status === 'Completed').length;
  const avgScore = metricsList.length > 0
    ? Math.round(metricsList.reduce((acc, { metrics }) => acc + (metrics?.score ?? 0), 0) / metricsList.length)
    : 0;
  const cashDeployed = metricsList.reduce((acc, { metrics }) => acc + (metrics?.totalCashInvested ?? (metrics?.purchasePrice ?? 0) + (metrics?.rehabCosts ?? 0)), 0);
  const totalNetProfit = metricsList.reduce((acc, { metrics }) => acc + (metrics?.netProfit ?? 0), 0);
  const portfolioRoi = cashDeployed > 0 ? ((totalNetProfit / cashDeployed) * 100) : 0;
  const avgHoldingMonths = metricsList.length > 0
    ? metricsList.reduce((acc, { metrics }) => acc + (metrics?.holdingMonths ?? metrics?.deal?.holdingMonths ?? 6), 0) / metricsList.length
    : 6;
  const annualizedRoi = avgHoldingMonths > 0 && portfolioRoi !== 0
    ? (Math.pow(1 + portfolioRoi / 100, 12 / avgHoldingMonths) - 1) * 100
    : portfolioRoi;

  // Markets and months for filters
  const markets = useMemo(() => {
    const set = new Set();
    deals.forEach((d) => {
      const m = (d.city && d.zipCode) ? `${d.city} - ${d.zipCode}` : (d.city || d.zipCode || 'Unknown');
      set.add(m);
    });
    return ['All', ...Array.from(set).sort()];
  }, [deals]);

  const months = useMemo(() => {
    const set = new Set();
    deals.forEach((d) => {
      if (d.createdAt) {
        const dte = new Date(d.createdAt);
        set.add(`${dte.getFullYear()}-${String(dte.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return ['All', ...Array.from(set).sort().reverse()];
  }, [deals]);

  // Filtered & sorted deals
  const filtered = useMemo(() => {
    let list = metricsList.map(({ deal, metrics }) => ({ deal, metrics }));
    if (filterStatus !== 'All') list = list.filter(({ deal }) => (deal.status || 'Analyzing') === filterStatus);
    if (filterScoreMin !== '') list = list.filter(({ metrics }) => (metrics?.score ?? 0) >= Number(filterScoreMin));
    if (filterScoreMax !== '') list = list.filter(({ metrics }) => (metrics?.score ?? 0) <= Number(filterScoreMax));
    if (filterMarket !== 'All') {
      list = list.filter(({ deal }) => {
        const m = (deal.city && deal.zipCode) ? `${deal.city} - ${deal.zipCode}` : (deal.city || deal.zipCode || '');
        return m === filterMarket;
      });
    }
    if (filterMonth !== 'All') {
      list = list.filter(({ deal }) => {
        if (!deal.createdAt) return false;
        const dte = new Date(deal.createdAt);
        const key = `${dte.getFullYear()}-${String(dte.getMonth() + 1).padStart(2, '0')}`;
        return key === filterMonth;
      });
    }
    if (showOnlyProfitable) list = list.filter(({ metrics }) => (metrics?.netProfit ?? 0) > 0);
    if (filterFunded) list = list.filter(({ deal }) => deal.isFunded || deal.status === 'Funded');
    if (filterClosed) list = list.filter(({ deal }) => deal.isClosed || deal.status === 'Closed' || deal.status === 'Completed');
    if (sortBy === 'profit') list = [...list].sort((a, b) => (b.metrics?.netProfit ?? 0) - (a.metrics?.netProfit ?? 0));
    else if (sortBy === 'roi') list = [...list].sort((a, b) => (b.metrics?.roi ?? 0) - (a.metrics?.roi ?? 0));
    else if (sortBy === 'score') list = [...list].sort((a, b) => (b.metrics?.score ?? 0) - (a.metrics?.score ?? 0));
    else if (sortBy === 'date') list = [...list].sort((a, b) => new Date(b.deal?.createdAt || 0) - new Date(a.deal?.createdAt || 0));
    return list;
  }, [metricsList, filterStatus, filterScoreMin, filterScoreMax, filterMarket, filterMonth, showOnlyProfitable, filterFunded, filterClosed, sortBy]);

  // Overlapping timelines: same month range (simplified: by createdAt/updatedAt month)
  const overlappingIds = useMemo(() => {
    if (!highlightOverlapping) return new Set();
    const byMonth = {};
    filtered.forEach(({ deal }) => {
      const start = deal.createdAt ? new Date(deal.createdAt).getTime() : 0;
      const end = deal.updatedAt ? new Date(deal.updatedAt).getTime() : start;
      const key = `${Math.min(start, end)}-${Math.max(start, end)}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(deal.id);
    });
    const ids = new Set();
    Object.values(byMonth).forEach((arr) => {
      if (arr.length > 1) arr.forEach((id) => ids.add(id));
    });
    return ids;
  }, [filtered, highlightOverlapping]);

  const toggleCompare = (id) => {
    if (selectedCompareIds.includes(id)) {
      setSelectedCompareIds((prev) => prev.filter((x) => x !== id));
    } else if (selectedCompareIds.length < 3) {
      setSelectedCompareIds((prev) => [...prev, id]);
    }
  };

  const comparisonDeals = useMemo(
    () => filtered.filter(({ deal }) => selectedCompareIds.includes(deal.id)).map(({ deal, metrics }) => ({ ...deal, metrics })),
    [filtered, selectedCompareIds]
  );

  const getStatusBadgeVariant = (status) => {
    const s = status || 'Analyzing';
    if (s === 'Completed' || s === 'Closed') return 'default';
    if (s === 'Under Contract') return 'secondary';
    if (s === 'Funded') return 'secondary';
    if (s === 'Abandoned') return 'destructive';
    return 'outline';
  };

  const getScoreColor = (score) => {
    const s = score ?? 0;
    if (s >= 80) return 'text-green-600';
    if (s >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted px-4 py-8 sm:px-8">
      <Helmet><title>Portfolio Dashboard | FlipIQ</title></Helmet>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb />
        <h1 className="text-3xl font-bold text-foreground mb-6">Portfolio Dashboard</h1>

        {/* 1. Portfolio Snapshot (Top Banner) */}
        <Card className="bg-card border-border shadow-sm mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <BarChart3 className="text-primary" />
              Portfolio Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
              <SnapshotMetric label="Total Deals Analyzed" value={totalDeals} />
              <SnapshotMetric label="Active Deals" value={activeDeals} sub="in pipeline" />
              <SnapshotMetric label="Closed Profitable" value={`${closedProfitable.length} (+$${Math.round(closedProfitableSum / 1000)}K)`} positive />
              <SnapshotMetric label="Closed Unprofitable" value={`${closedUnprofitable.length} (−$${Math.round(closedUnprofitableSum / 1000)}K)`} negative />
              <SnapshotMetric label="Pending / Under Contract" value={pendingUnderContract} />
              <SnapshotMetric label="Funded" value={fundedCount} />
              <SnapshotMetric label="Closed" value={closedCount} />
              <SnapshotMetric label="Avg Deal Score" value={`${avgScore}/100`} />
              <SnapshotMetric label="Portfolio ROI (Ann.)" value={`${annualizedRoi.toFixed(1)}%`} positive={annualizedRoi >= 0} negative={annualizedRoi < 0} />
              <SnapshotMetric label="Cash Deployed" value={`$${(cashDeployed / 1e6).toFixed(2)}M`} />
            </div>
          </CardContent>
        </Card>

        {/* 2. Filters + Deal Grid */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <Card className="lg:w-72 shrink-0 bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <Filter className="text-primary" size={18} />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Score Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    min={0}
                    max={100}
                    value={filterScoreMin}
                    onChange={(e) => setFilterScoreMin(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min={0}
                    max={100}
                    value={filterScoreMax}
                    onChange={(e) => setFilterScoreMax(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Market</label>
                <Select value={filterMarket} onValueChange={setFilterMarket}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {markets.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Month Analyzed</label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Show Only Profitable</span>
                <Switch checked={showOnlyProfitable} onCheckedChange={setShowOnlyProfitable} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Overlapping Timelines</span>
                <Switch checked={highlightOverlapping} onCheckedChange={setHighlightOverlapping} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Funded only</span>
                <Switch checked={filterFunded} onCheckedChange={setFilterFunded} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Closed only</span>
                <Switch checked={filterClosed} onCheckedChange={setFilterClosed} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Net Profit</SelectItem>
                    <SelectItem value="roi">ROI</SelectItem>
                    <SelectItem value="score">Deal Score</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(({ deal, metrics }) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  metrics={metrics}
                  isOwnDeal={deal.userId === currentUser?.id}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  getScoreColor={getScoreColor}
                  formatDate={formatDate}
                  isOverlapping={highlightOverlapping && overlappingIds.has(deal.id)}
                  isCompareSelected={selectedCompareIds.includes(deal.id)}
                  onToggleCompare={() => toggleCompare(deal.id)}
                  onViewAnalysis={() => navigate(`/deal-analysis?id=${deal.id}`)}
                  onExportPdf={() => navigate(`/deal-analysis?id=${deal.id}&export=pdf`)}
                  onSaveFavorite={() => handleSaveFavorite(deal)}
                  isFavorite={!!deal.isFavorite}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 bg-card rounded-xl border border-border text-muted-foreground">
                No deals match the current filters.
              </div>
            )}
          </div>
        </div>

        {/* 3. Deal Comparison Tool */}
        <Card className="bg-card border-border shadow-sm mt-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Layers className="text-primary" />
              Deal Comparison Tool
            </CardTitle>
            <p className="text-sm text-muted-foreground">Select up to 3 deals above (checkbox on each card) to compare side-by-side.</p>
          </CardHeader>
          <CardContent>
            {comparisonDeals.length === 0 ? (
              <div className="text-center py-12 bg-muted/50 rounded-xl border border-dashed border-border text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select 2–3 deals from the grid to compare them side-by-side.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 bg-muted/50 font-semibold text-foreground sticky left-0 z-10 min-w-[140px]">Metric</th>
                      {comparisonDeals.map((deal) => (
                        <th key={deal.id} className="p-3 bg-muted/50 border-l border-border min-w-[160px]">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-foreground text-sm">{deal.address}</span>
                            <button type="button" onClick={() => toggleCompare(deal.id)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                          </div>
                          <span className="text-xs text-muted-foreground">{deal.status || 'Analyzing'}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <ComparisonRow label="ARV" data={comparisonDeals} field="arv" format={(v) => formatCompactCurrency(Number(v) || 0)} />
                    <ComparisonRow label="Rehab % of ARV" data={comparisonDeals} formatRehabPct />
                    <ComparisonRow label="Holding Months" data={comparisonDeals} field="holdingMonths" format={(v) => formatHoldingMonths(Number(v) || 0)} />
                    <ComparisonRow label="Net Profit" data={comparisonDeals} field="metrics.netProfit" format={(v) => formatCompactCurrency(Number(v) || 0)} highlightMax />
                    <ComparisonRow label="ROI" data={comparisonDeals} field="metrics.roi" format={(v) => formatRoi(Number(v) || 0)} highlightMax />
                    <ComparisonRow label="Risk Score" data={comparisonDeals} field="metrics.score" format={(v) => `${Math.round(Number(v) || 0)}`} highlightMax />
                    <ComparisonRow label="Amount Approved" data={comparisonDeals} field="amountApproved" format={(v) => v != null && v !== '' ? formatCompactCurrency(Number(v)) : '—'} />
                    <ComparisonRow label="LTV %" data={comparisonDeals} field="ltvPercent" format={(v) => v != null && v !== '' ? `${Number(v)}%` : '—'} />
                    <ComparisonRow label="Funding Rate %" data={comparisonDeals} field="fundingRatePercent" format={(v) => v != null && v !== '' ? `${Number(v)}%` : '—'} />
                    <ComparisonRow label="Agent / source" data={comparisonDeals} field="dealAgentName" formatText />
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function SnapshotMetric({ label, value, sub, positive, negative }) {
  let color = 'text-foreground';
  if (positive) color = 'text-green-600';
  if (negative) color = 'text-red-600';
  return (
    <div className="bg-muted/50 rounded-lg p-3 border border-border">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DealCard({
  deal,
  metrics,
  isOwnDeal,
  getStatusBadgeVariant,
  getScoreColor,
  formatDate,
  isOverlapping,
  isCompareSelected,
  onToggleCompare,
  onViewAnalysis,
  onExportPdf,
  onSaveFavorite,
  isFavorite,
}) {
  const status = deal.status || 'Analyzing';
  const score = metrics?.score ?? 0;
  const netProfit = metrics?.netProfit ?? 0;
  const roi = metrics?.roi ?? 0;
  const annualizedRoi = metrics?.annualizedRoi ?? roi;
  const arv = deal.arv ?? metrics?.arv ?? 0;
  const purchase = deal.purchasePrice ?? metrics?.purchasePrice ?? 0;
  const holdingMonths = deal.holdingMonths ?? metrics?.holdingMonths ?? 6;
  const market = (deal.city && deal.zipCode) ? `${deal.city} - ${deal.zipCode}` : (deal.city || deal.zipCode || '—');
  const hotness = Math.min(10, Math.round((score / 100) * 10) || 5);

  return (
    <motion.div
      layout
      className={`rounded-xl border bg-card shadow-sm overflow-hidden ${isOverlapping ? 'ring-2 ring-amber-500' : 'border-border'}`}
    >
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={getStatusBadgeVariant(status)}>{status === 'Abandoned' ? 'Failed' : status}</Badge>
              {(deal.isFunded || status === 'Funded') && <Badge variant="secondary" className="text-xs">Funded</Badge>}
              {(deal.isClosed || status === 'Closed' || status === 'Completed') && <Badge variant="outline" className="text-xs">Closed</Badge>}
            </div>
            <span className={`text-sm font-bold ${getScoreColor(score)}`}>Score: {Math.round(score)}</span>
          </div>
          <CardTitle className="text-base mt-2 truncate text-foreground">{deal.address || 'Unknown'}</CardTitle>
          {(deal.dealAgentName || deal.fundedTerms) && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {deal.dealAgentName && <span>Contact: {deal.dealAgentName}</span>}
              {deal.dealAgentName && deal.fundedTerms && ' · '}
              {deal.fundedTerms && <span>Terms: {deal.fundedTerms}</span>}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>ARV → Purchase</span>
            <span className="text-foreground font-medium">${Number(arv).toLocaleString()} → ${Number(purchase).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net Profit</span>
            <span className={netProfit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              ${Math.round(netProfit).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>ROI</span>
            <span className="text-foreground">{roi.toFixed(1)}% <span className="text-xs">(ann. {annualizedRoi.toFixed(0)}%)</span></span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Timeline</span>
            <span className="text-foreground">Start: {formatDate(deal.createdAt)} → Close: {formatDate(deal.updatedAt)}</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (holdingMonths / 12) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Market</span>
            <span className="text-foreground">{market} <span className="text-amber-500">★ {hotness}/10</span></span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" className="text-xs" onClick={onViewAnalysis}>
              <Eye size={12} className="mr-1" /> View Analysis
            </Button>
            {isOwnDeal && (
              <Button size="sm" variant="ghost" className="text-xs" onClick={onSaveFavorite} title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}>
                <Star size={12} className={`mr-1 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} /> Save
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs" onClick={onExportPdf}>
              <Download size={12} className="mr-1" /> Export PDF
            </Button>
            <label className="flex items-center gap-1 cursor-pointer text-xs text-muted-foreground">
              <input type="checkbox" checked={isCompareSelected} onChange={() => onToggleCompare()} className="rounded border-input" />
              Compare
            </label>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ComparisonRow({ label, data, field, format, formatRehabPct, formatText, highlightMax }) {
  let values = [];
  if (formatRehabPct) {
    values = data.map((d) => {
      const arv = d.arv ?? d.metrics?.arv ?? 1;
      const rehab = d.rehabCosts ?? d.metrics?.rehabCosts ?? 0;
      return arv > 0 ? (rehab / arv) * 100 : 0;
    });
  } else if (formatText) {
    values = data.map((d) => {
      const keys = (field || '').split('.');
      let v = d;
      keys.forEach((k) => (v = v?.[k]));
      return v != null ? String(v) : '—';
    });
  } else {
    values = data.map((d) => {
      const keys = (field || '').split('.');
      let v = d;
      keys.forEach((k) => (v = v?.[k]));
      return Number(v) ?? 0;
    });
  }
  const formatter = format || ((v) => v);
  const max = typeof values[0] === 'number' ? Math.max(...values) : null;

  return (
    <tr className="border-b border-border hover:bg-muted/30">
      <td className="p-3 font-medium text-foreground bg-muted/30 sticky left-0">{label}</td>
      {values.map((val, i) => {
        const isBest = highlightMax && max != null && val === max && val > 0;
        return (
          <td key={i} className={`p-3 border-l border-border ${isBest ? 'bg-primary/10 font-bold text-primary' : ''}`}>
            {formatRehabPct ? `${val.toFixed(1)}%` : formatText ? val : formatter(val)}
          </td>
        );
      })}
    </tr>
  );
}

export default PortfolioDashboard;
