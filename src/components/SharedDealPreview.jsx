import React from 'react';
import { MapPin, Building2, Maximize2, Wallet, Hammer, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Compact preview card for shared deal links. Shows address, rooms, sqft,
 * project cost, rehab estimate, and net profit at a glance.
 */
const SharedDealPreview = ({ deal, metrics }) => {
  if (!deal) return null;

  const address = deal.address || 'Untitled Deal';
  const beds = deal.bedrooms ?? deal.propertyIntelligence?.bedrooms;
  const baths = deal.bathrooms ?? deal.propertyIntelligence?.bathrooms;
  const sqft = deal.sqft ?? deal.squareFootage ?? deal.propertyIntelligence?.squareFootage;
  const projectCost = metrics?.totalProjectCost ?? deal.totalProjectCost;
  const rehabEstimate = metrics?.rehabCosts ?? deal.rehabCosts ?? metrics?.rehab?.total;
  const netProfit = metrics?.netProfit ?? deal.netProfit;
  const hasSpecs = beds != null || baths != null || sqft != null;

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <CardTitle className="text-xl font-bold text-foreground">{address}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Shared deal summary</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {hasSpecs && (
            <>
              {(beds != null || baths != null) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-border">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Rooms</p>
                    <p className="text-sm font-bold text-foreground">
                      {[beds != null ? `${beds} bed` : null, baths != null ? `${baths} bath` : null].filter(Boolean).join(' / ')}
                    </p>
                  </div>
                </div>
              )}
              {sqft != null && Number(sqft) > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-border">
                  <Maximize2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Sqft</p>
                    <p className="text-sm font-bold text-foreground">{Number(sqft).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-border">
            <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Project cost</p>
              <p className="text-sm font-bold text-foreground">
                {projectCost != null ? `$${Number(projectCost).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-border">
            <Hammer className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Rehab estimate</p>
              <p className="text-sm font-bold text-foreground">
                {rehabEstimate != null ? `$${Number(rehabEstimate).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-border">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Est. profit</p>
              <p className={`text-sm font-bold ${netProfit != null && Number(netProfit) >= 0 ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}>
                {netProfit != null ? `$${Number(netProfit).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharedDealPreview;
