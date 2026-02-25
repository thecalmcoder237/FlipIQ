
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Bed, Bath, Maximize, Calendar, RefreshCw, AlertCircle, Car, Layers, Warehouse, BarChart3, Plus, Search } from 'lucide-react';
import { formatDateUS } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CompsMap from './CompsMap';
import ErrorBoundary from './ErrorBoundary';
import AddCompModal from './AddCompModal';

const CompsDisplay = ({ comps, loading, onRefresh, source = "AI", subjectAddress, subjectSpecs, avmValue, tableOnly = false, subjectLat, subjectLng, isMapVisible = true, onAddComp, onSearchCompsWithAI, compsSearching = false }) => {
  const [addCompModalOpen, setAddCompModalOpen] = useState(false);

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
          <div className="flex flex-wrap justify-center gap-2">
            {onAddComp && (
              <Button onClick={() => setAddCompModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Add comp manually
              </Button>
            )}
            {onSearchCompsWithAI && (
              <Button onClick={onSearchCompsWithAI} disabled={compsSearching} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                {compsSearching ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search comps with AI
              </Button>
            )}
            <Button onClick={onRefresh} variant="outline" className="border-primary text-primary hover:bg-primary/10">
               Try Again
            </Button>
          </div>
          {onAddComp && (
            <AddCompModal open={addCompModalOpen} onOpenChange={setAddCompModalOpen} onSubmit={(comp) => { onAddComp(comp); setAddCompModalOpen(false); }} />
          )}
       </div>
    );
  }

  const hasSubjectData = subjectAddress || subjectSpecs || avmValue != null;

  const ComparisonTable = () => (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Subject vs Comparables
        </CardTitle>
        {hasSubjectData && (
          <p className="text-sm text-muted-foreground">
            Subject: {subjectAddress || subjectSpecs?.address || '—'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium w-[120px] sticky left-0 bg-card z-10">Attribute</TableHead>
                {hasSubjectData && <TableHead className="text-muted-foreground font-medium">Subject</TableHead>}
                {comps.map((_, i) => (
                  <TableHead key={i} className="text-muted-foreground font-medium whitespace-nowrap">Comp {i + 1}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Address</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">{subjectAddress || subjectSpecs?.address || '—'}</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground max-w-[180px]">
                    <span className="block truncate" title={comp.address || '—'}>{comp.address || '—'}</span>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Price</TableCell>
                {hasSubjectData && (
                  <TableCell className="text-foreground font-semibold">
                    {avmValue != null ? `$${Number(avmValue).toLocaleString()}` : '—'}
                  </TableCell>
                )}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground font-semibold">
                    {comp.salePrice != null ? `$${Number(comp.salePrice).toLocaleString()}` : comp.price != null ? `$${Number(comp.price).toLocaleString()}` : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">$/sqft</TableCell>
                {hasSubjectData && (
                  <TableCell className="text-foreground">
                    {avmValue != null && (subjectSpecs?.squareFootage ?? subjectSpecs?.sqft) != null
                      ? `$${Math.round(avmValue / (Number(subjectSpecs?.squareFootage ?? subjectSpecs?.sqft) || 1))}`
                      : '—'}
                  </TableCell>
                )}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">
                    {(comp.salePrice ?? comp.price) != null && comp.sqft != null
                      ? `$${Math.round((Number(comp.salePrice ?? comp.price) || 0) / (Number(comp.sqft) || 1))}`
                      : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Beds</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">{subjectSpecs?.bedrooms ?? '—'}</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">{comp.beds ?? comp.bedrooms ?? '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Baths</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">{subjectSpecs?.bathrooms ?? '—'}</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">{comp.baths ?? comp.bathrooms ?? '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Sqft</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">{subjectSpecs?.squareFootage ?? subjectSpecs?.sqft ?? '—'}</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">{comp.sqft ?? '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Year Built</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">{subjectSpecs?.yearBuilt ?? '—'}</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">{comp.yearBuilt ?? '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Distance</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">—</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">
                    {comp.distance != null ? `${Number(comp.distance).toFixed(2)} mi` : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card">Sale Date</TableCell>
                {hasSubjectData && <TableCell className="text-foreground">—</TableCell>}
                {comps.map((comp, i) => (
                  <TableCell key={i} className="text-foreground">{formatDateUS(comp.saleDate)}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-border hover:bg-accent/50">
                <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card flex items-center gap-1">
                  <Calendar size={13} className="shrink-0" /> DOM
                </TableCell>
                {hasSubjectData && <TableCell className="text-foreground">—</TableCell>}
                {comps.map((comp, i) => {
                  const dom = comp.dom ?? comp.daysOnMarket;
                  return (
                    <TableCell key={i} className="text-foreground">
                      {dom != null ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          dom <= 14 ? 'bg-green-100 text-green-700' :
                          dom <= 30 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {dom}d
                        </span>
                      ) : '—'}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (tableOnly) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Home className="text-primary" /> Recent Comparable Sales
            <span className="text-sm font-normal text-muted-foreground ml-1">({comps.length} comps)</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded border border-border">Source: {source}</span>
            {onAddComp && (
              <Button size="sm" variant="ghost" onClick={() => setAddCompModalOpen(true)} className="text-muted-foreground hover:text-foreground" title="Add comp manually">
                <Plus className="w-4 h-4 mr-2" /> Add comp
              </Button>
            )}
            {onSearchCompsWithAI && (
              <Button size="sm" variant="ghost" onClick={onSearchCompsWithAI} disabled={compsSearching} className="text-muted-foreground hover:text-foreground" title="Search comps with ChatGPT">
                {compsSearching ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search with AI
              </Button>
            )}
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
        <ComparisonTable />
        {isMapVisible && subjectLat && subjectLng && comps?.length > 0 && (
          <ErrorBoundary
            fallback={
              <div className="rounded-xl border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                Map could not be loaded. The table above shows all comparable sales.
              </div>
            }
          >
            <CompsMap
              subjectLat={subjectLat}
              subjectLng={subjectLng}
              subjectAddress={subjectAddress}
              comps={comps}
            />
          </ErrorBoundary>
        )}
        {onAddComp && <AddCompModal open={addCompModalOpen} onOpenChange={setAddCompModalOpen} onSubmit={(comp) => { onAddComp(comp); setAddCompModalOpen(false); }} />}
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
            {onAddComp && (
              <Button size="sm" variant="ghost" onClick={() => setAddCompModalOpen(true)} className="text-muted-foreground hover:text-foreground" title="Add comp manually">
                <Plus className="w-4 h-4 mr-2" /> Add comp
              </Button>
            )}
            {onSearchCompsWithAI && (
              <Button size="sm" variant="ghost" onClick={onSearchCompsWithAI} disabled={compsSearching} className="text-muted-foreground hover:text-foreground" title="Search comps with ChatGPT">
                {compsSearching ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search with AI
              </Button>
            )}
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
                     <p className="text-xs text-muted-foreground">{comp.saleDate ? `Sold: ${formatDateUS(comp.saleDate)}` : 'Recently Sold'}</p>
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

      {comps.length > 0 && hasSubjectData && (
        <ComparisonTable />
      )}
      {isMapVisible && subjectLat && subjectLng && comps?.length > 0 && (
        <ErrorBoundary
          fallback={
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              Map could not be loaded. The table above shows all comparable sales.
            </div>
          }
        >
          <CompsMap
            subjectLat={subjectLat}
            subjectLng={subjectLng}
            subjectAddress={subjectAddress}
            comps={comps}
          />
        </ErrorBoundary>
      )}
      {onAddComp && <AddCompModal open={addCompModalOpen} onOpenChange={setAddCompModalOpen} onSubmit={(comp) => { onAddComp(comp); setAddCompModalOpen(false); }} />}
    </div>
  );
};

export default CompsDisplay;
