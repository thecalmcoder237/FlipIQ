
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, DollarSign, ChevronDown, ChevronUp, RefreshCw, Sparkles, AlertTriangle, History, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { validatePropertyInput } from "@/utils/validationUtils";
import { normalizePropertyIntelligenceResponse } from "@/utils/propertyIntelligenceSchema";
import { useToast } from "@/components/ui/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logDataFlow } from "@/utils/dataFlowDebug";
import { useAuth } from '@/contexts/AuthContext';
import { fetchPropertyIntelligence, fetchComps, getPropertyApiUsage, resetPropertyApiUsage } from '@/services/edgeFunctionService';

/** Renders property detail values: primitives as text, arrays as tags/list, objects as styled key-value blocks. */
function DetailValueCell({ value }) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">—</span>;
    const items = value.map((item, i) => {
      if (item != null && typeof item === 'object' && !Array.isArray(item)) {
        const entries = Object.entries(item).filter(([, v]) => v != null && v !== '');
        if (entries.length === 0) return null;
        return (
          <div key={i} className="rounded-md bg-muted/50 px-2 py-1.5 text-xs border border-border/50 space-y-0.5">
            {entries.map(([k, v]) => (
              <div key={k}>
                <span className="text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </div>
            ))}
          </div>
        );
      }
      return (
        <span key={i} className="inline-block rounded-md bg-muted/50 px-2 py-0.5 text-xs mr-1 mb-1 border border-border/50">
          {String(item)}
        </span>
      );
    });
    return (
      <div className="flex flex-wrap gap-1.5 text-foreground">
        {items.filter(Boolean)}
      </div>
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v != null && v !== '' && (typeof v !== 'object' || (Array.isArray(v) && v.length > 0)));
    if (entries.length === 0) return <span className="text-muted-foreground italic">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-center rounded-md bg-muted/70 px-2 py-0.5 text-xs font-medium text-foreground border border-border/50"
          >
            <span className="text-muted-foreground mr-1">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
            {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

const PropertyIntelligenceSection = ({ inputs, calculations, onPropertyDataFetch, propertyData }) => {
  const { currentUser } = useAuth();
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [isCompsOpen, setIsCompsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [compsRefreshing, setCompsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [apiUsage, setApiUsage] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    logDataFlow('PROPERTY_INTELLIGENCE_PROPS', { inputs, calculations, hasData: !!propertyData }, new Date());
  }, [inputs, calculations, propertyData]);

  useEffect(() => {
    if (!currentUser?.id) return;
    getPropertyApiUsage(currentUser.id)
      .then((data) => data && setApiUsage(data))
      .catch(() => {});
  }, [currentUser?.id]);

  const handleResetUsage = async () => {
    if (!currentUser?.id) return;
    const data = await resetPropertyApiUsage(currentUser.id);
    if (data) {
      setApiUsage(data);
      toast({ title: "Count reset", description: "RentCast API usage count has been reset to 0." });
    } else {
      toast({ variant: "destructive", title: "Reset failed", description: "Could not reset usage count." });
    }
  };

  const handleFetchIntelligence = async () => {
    setFetchError(null);
    logDataFlow('FETCH_PROPERTY_CLICK', { inputs }, new Date());

    const validation = validatePropertyInput(inputs?.address, inputs?.zipCode, {
      city: inputs?.city,
      county: inputs?.county,
    });
    if (!validation.valid) {
      setFetchError(validation.error);
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: validation.error
      });
      return;
    }

    setLoading(true);

    try {
      const address = (inputs.address || "").trim();
      const zipToSend = (inputs.zipCode || "").trim().replace(/\D/g, "").slice(0, 5);
      const citySend = inputs.city || inputs.propertyIntelligence?.city;
      const countySend = inputs.county || inputs.propertyIntelligence?.county;
      const stateSend = inputs.propertyIntelligence?.state || inputs.state;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:requestParams',message:'refresh request body',data:{address,zipToSend,city:citySend,county:countySend,state:stateSend,cityWithoutCounty:!!(citySend&&!countySend)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      let propertyResponse = null;
      let compsResponse = null;
      try {
        propertyResponse = await fetchPropertyIntelligence(
          address,
          zipToSend,
          inputs.propertyType || "Single-Family",
          Number(inputs.arv) || 0,
          {
            formattedAddress: address,
            city: citySend,
            county: countySend,
            state: stateSend,
            propertyId: inputs.propertyIntelligence?.propertyId,
            userId: currentUser?.id,
          }
        );
      } catch (propertyErr) {
        console.warn('Property fetch failed, still fetching comps:', propertyErr?.message);
      }
      // Pass propertyId from property response so fetch-comps can exclude the subject by ID (fast, accurate); falls back to address matching if missing.
      const propertyIdForComps =
        propertyResponse?.propertyId ?? propertyResponse?.id ?? propertyResponse?.parcelId
        ?? inputs.propertyIntelligence?.propertyId ?? inputs.propertyIntelligence?.id ?? inputs.propertyIntelligence?.parcelId;
      try {
        compsResponse = await fetchComps(address, zipToSend, {
          city: citySend,
          state: stateSend,
          propertyId: propertyIdForComps,
          subjectAddress: propertyResponse?.address ?? propertyResponse?.formattedAddress ?? propertyResponse?.streetAddress ?? address,
          userId: currentUser?.id,
        });
      } catch (compsErr) {
        console.warn('Comps fetch failed:', compsErr?.message);
      }
      const data = {
        ...(propertyResponse || {}),
        recentComps: Array.isArray(compsResponse?.recentComps) ? compsResponse.recentComps : [],
        ...(compsResponse?.subjectSaleListing != null ? { subjectSaleListing: compsResponse.subjectSaleListing } : {}),
        ...(compsResponse?.avmValue != null ? { avmValue: compsResponse.avmValue } : {}),
        ...(compsResponse?.avmSubject != null ? { avmSubject: compsResponse.avmSubject } : {}),
        usage: compsResponse?.usage ?? propertyResponse?.usage,
        warnings: [].concat(
          Array.isArray(propertyResponse?.warnings) ? propertyResponse.warnings : [],
          Array.isArray(compsResponse?.warnings) ? compsResponse.warnings : []
        ).filter(Boolean),
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:afterFetch',message:'raw edge response',data:{dataNull:!data,dataError:data?.error,topKeys:data?Object.keys(data):[],hasYearBuilt:!!(data?.yearBuilt??data?.year_built),hasPropertyType:!!(data?.propertyType??data?.property_type),recentCompsLen:Array.isArray(data?.recentComps)?data.recentComps.length:(Array.isArray(data?.recent_comps)?data.recent_comps.length:0),hasProperty:!!(data?.property&&typeof data.property==='object'),hasRealieData:data?.hasRealieData,rentCastCalled:data?.rentCastCalled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{}); fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:rawResponseDump',message:'full raw response (truncated)',data:{rawJson:data!=null?JSON.stringify(data).slice(0,2500):null,_debug:data?._debug},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
      // #endregion

      const normalized = normalizePropertyIntelligenceResponse(data || {});
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:afterNormalize',message:'normalized payload',data:{normKeys:Object.keys(normalized),propertyType:normalized?.propertyType,yearBuilt:normalized?.yearBuilt,recentCompsLen:normalized?.recentComps?.length??0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
      // #endregion
      const compsDropped = Array.isArray(data?.recentComps) ? data.recentComps.length - (normalized.recentComps?.length ?? 0) : 0;
      const hasUsableData =
        (normalized.recentComps?.length ?? 0) > 0 ||
        normalized.propertyType ||
        normalized.yearBuilt != null ||
        (normalized.squareFootage != null && Number(normalized.squareFootage) > 0) ||
        normalized.bedrooms != null ||
        normalized.bathrooms != null ||
        normalized.county ||
        normalized.schoolDistrict;
      if (!hasUsableData) {
        toast({
          title: "No data found",
          description: "No property details or comps were returned for this address. Try another address or check back later.",
        });
      } else if (compsDropped > 0) {
        logDataFlow('FETCH_COMPS_DROPPED', compsDropped, new Date());
        toast({ title: "Success", description: `Property intelligence retrieved. ${compsDropped} comp(s) excluded due to missing data.` });
      } else {
        toast({ title: "Success", description: "Property intelligence retrieved successfully." });
      }

      if (onPropertyDataFetch) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:beforeOnPropertyDataFetch',message:'calling onPropertyDataFetch',data:{hasUsableData,normKeys:Object.keys(normalized),recentCompsLen:normalized?.recentComps?.length??0,propertyType:normalized?.propertyType,yearBuilt:normalized?.yearBuilt},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
        // #endregion
        onPropertyDataFetch(normalized);
      }
      if (data?.usage && currentUser?.id) {
        setApiUsage({
          realie_count: data.usage.realie_count,
          rentcast_count: data.usage.rentcast_count,
          realie_limit: data.usage.realie_limit ?? 25,
          rentcast_limit: data.usage.rentcast_limit ?? 50,
        });
      }
    } catch (err) {
      console.error('❌ Property intelligence error:', err);
      logDataFlow('FETCH_ERROR', err?.message, new Date());
      setFetchError(err?.message || 'Failed to fetch property data.');
      toast({
        variant: 'destructive',
        title: 'Fetch failed',
        description: err?.message || 'Failed to fetch property data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshComps = async (e) => {
    e?.stopPropagation?.();
    const validation = validatePropertyInput(inputs?.address, inputs?.zipCode, { city: inputs?.city, county: inputs?.county });
    if (!validation.valid) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: validation.error });
      return;
    }
    const address = (inputs.address || '').trim();
    const zipToSend = (inputs.zipCode || '').trim().replace(/\D/g, '').slice(0, 5);
    const citySend = inputs.city || inputs.propertyIntelligence?.city;
    const stateSend = inputs.propertyIntelligence?.state || inputs.state;
    setCompsRefreshing(true);
    // Pass propertyId from existing property intelligence so fetch-comps can exclude the subject by ID.
    const propertyIdForComps =
      inputs.propertyIntelligence?.propertyId ?? inputs.propertyIntelligence?.id ?? inputs.propertyIntelligence?.parcelId;
    try {
      const compsResponse = await fetchComps(address, zipToSend, {
        city: citySend,
        state: stateSend,
        propertyId: propertyIdForComps,
        subjectAddress: inputs.propertyIntelligence?.address ?? inputs.propertyIntelligence?.formattedAddress ?? inputs.propertyIntelligence?.streetAddress ?? address,
        userId: currentUser?.id,
      });
      const merged = {
        ...(inputs.propertyIntelligence || {}),
        recentComps: Array.isArray(compsResponse?.recentComps) ? compsResponse.recentComps : [],
        ...(compsResponse?.subjectSaleListing != null ? { subjectSaleListing: compsResponse.subjectSaleListing } : {}),
        ...(compsResponse?.avmValue != null ? { avmValue: compsResponse.avmValue } : {}),
        ...(compsResponse?.avmSubject != null ? { avmSubject: compsResponse.avmSubject } : {}),
        usage: compsResponse?.usage ?? inputs.propertyIntelligence?.usage,
        warnings: [].concat(
          Array.isArray(inputs.propertyIntelligence?.warnings) ? inputs.propertyIntelligence.warnings : [],
          Array.isArray(compsResponse?.warnings) ? compsResponse.warnings : []
        ).filter(Boolean),
      };
      const normalized = normalizePropertyIntelligenceResponse(merged);
      if (onPropertyDataFetch) onPropertyDataFetch(normalized);
      if (compsResponse?.usage && currentUser?.id) {
        setApiUsage({
          realie_count: compsResponse.usage.realie_count,
          rentcast_count: compsResponse.usage.rentcast_count,
          realie_limit: compsResponse.usage.realie_limit ?? 25,
          rentcast_limit: compsResponse.usage.rentcast_limit ?? 50,
        });
      }
      const count = normalized?.recentComps?.length ?? 0;
      toast({ title: 'Comps refreshed', description: count ? `${count} comparable sale(s) loaded.` : 'No comparable sales found for this address.' });
    } catch (err) {
      console.error('❌ Comps refresh error:', err);
      toast({
        variant: 'destructive',
        title: 'Comps refresh failed',
        description: err.message || 'Failed to refresh comps. Please try again.',
      });
    } finally {
      setCompsRefreshing(false);
    }
  };

  const hasData = !!propertyData;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:render',message:'propertyData for display',data:{hasData,propertyDataKeys:propertyData?Object.keys(propertyData):[],hasPropertySpecs:!!(propertyData?.propertySpecs&&typeof propertyData.propertySpecs==='object'),hasProperty:!!(propertyData?.property&&typeof propertyData.property==='object')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H4'})}).catch(()=>{});
  // #endregion
  // Flatten: use top-level propertyData and merge nested propertySpecs/property (Realie) so display matches Rehab tab
  const flat = propertyData?.propertySpecs && typeof propertyData.propertySpecs === 'object'
    ? { ...propertyData, ...propertyData.propertySpecs }
    : propertyData?.property && typeof propertyData.property === 'object'
      ? { ...propertyData, ...propertyData.property }
      : propertyData || {};
  const { recentComps, propertySpecs, property: _p, rawRentCastRecord, ...specs } = flat;
  const fullRecord = rawRentCastRecord && typeof rawRentCastRecord === 'object' ? rawRentCastRecord : null;
  const propertyHistory = Array.isArray(fullRecord?.history) ? fullRecord.history : Array.isArray(specs?.history) ? specs.history : [];
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c06921ed-47f4-4a39-a851-8dc1a5aa6177',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:flatSpecs',message:'flat/specs/recentComps',data:{flatKeys:Object.keys(flat),specsKeys:Object.keys(specs),specsPropertyType:specs?.propertyType,specsYearBuilt:specs?.yearBuilt,recentCompsLen:recentComps?.length??0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  const rentcastAtLimit = apiUsage && apiUsage.rentcast_count >= (apiUsage.rentcast_limit ?? 50);
  const fetchDisabled = rentcastAtLimit;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Fetch Card / Header Section */}
        {!hasData && !loading && (
           <Card className="bg-card border-border border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-primary/20 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Property Data & Comps</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Property data and comps from RentCast.
              </p>
              {apiUsage && (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-muted-foreground">
                    RentCast {apiUsage.rentcast_count}/{apiUsage.rentcast_limit ?? 50}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleResetUsage}
                    title="Reset count (e.g. when a new plan period starts)"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
              )}
              <Button 
                onClick={handleFetchIntelligence} 
                disabled={!inputs?.address || inputs.address.length < 3 || fetchDisabled}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]"
                title={fetchDisabled ? 'Monthly API limit reached. Resets next month.' : undefined}
              >
                Fetch Property Data
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="h-48 bg-muted rounded-xl flex items-center justify-center border border-border">
            <div className="flex flex-col items-center gap-3">
               <RefreshCw className="w-8 h-8 text-primary animate-spin" />
               <p className="text-sm text-muted-foreground font-medium">Analyzing property records & market data...</p>
            </div>
          </div>
        )}

        {fetchError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 flex flex-col items-start gap-2">
                <div className="flex items-center gap-2 font-bold text-foreground">
                    <AlertTriangle className="h-5 w-5"/>
                    <span>Error Fetching Property Details</span>
                </div>
                <p className="text-sm text-foreground">{fetchError}</p>
                <Button variant="outline" size="sm" onClick={() => setFetchError(null)} className="mt-2 border-border text-foreground hover:bg-accent">
                    Dismiss
                </Button>
            </div>
        )}

        {hasData && (
          <>
            {/* Specs Section */}
            <Card className="bg-card border-border overflow-hidden shadow-sm">
              <CardHeader 
                className="cursor-pointer hover:bg-accent/50 transition-colors flex flex-row items-center justify-between"
                onClick={() => setIsSpecsOpen(!isSpecsOpen)}
              >
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="text-primary" /> Property Details
                </CardTitle>
                <p className="text-xs text-muted-foreground absolute right-4 top-14">Property data and comps from RentCast.</p>
                <div className="flex items-center gap-2">
                   {apiUsage && (
                     <>
                       <span className="text-xs text-muted-foreground mr-1">
                         RentCast {apiUsage.rentcast_count}/{apiUsage.rentcast_limit ?? 50}
                       </span>
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                         onClick={(e) => { e.stopPropagation(); handleResetUsage(); }}
                         title="Reset count (e.g. when a new plan period starts)"
                       >
                         <RotateCcw className="h-3.5 w-3" />
                       </Button>
                     </>
                   )}
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                     onClick={(e) => { e.stopPropagation(); handleFetchIntelligence(); }}
                     disabled={fetchDisabled}
                     title={fetchDisabled ? 'Monthly API limit reached.' : undefined}
                   >
                     <RefreshCw className="h-4 w-4" />
                   </Button>
                   {isSpecsOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                </div>
              </CardHeader>
              <AnimatePresence>
                {isSpecsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="text-muted-foreground font-medium w-[40%]">Detail</TableHead>
                              <TableHead className="text-muted-foreground font-medium">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const skip = new Set(['recentComps', 'usage', 'source', 'warnings', 'rawRentCastRecord', 'history', 'propertySpecs', 'property', 'taxAmount', 'TaxAmount', 'annual_property_taxes', 'propertyTax', 'annualTax', 'tax', 'totalTax', 'taxAssessedValue', 'assessed_value', 'tax_assessed_value', 'assessmentValue', 'taxAssessment']);
                              const order = ['address', 'propertyType', 'yearBuilt', 'squareFootage', 'bedrooms', 'bathrooms', 'county', 'schoolDistrict', 'zoning', 'annualPropertyTaxes', 'assessedValue', 'parcelId', 'propertyId', 'latitude', 'longitude', 'lastSalePrice', 'lastSaleDate'];
                              // Prefer normalized specs so annualPropertyTaxes/assessedValue show; merge fullRecord for any extra raw fields
                              const src = { ...(fullRecord || {}), ...specs };
                              const formatLabel = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace(/_/g, ' ');
                              const formatVal = (k, v) => {
                                if (v === undefined || v === null || v === '') return null;
                                if ((k === 'annualPropertyTaxes' || k === 'assessedValue') && (typeof v === 'number' || Number(v) == v)) return `$${Number(v).toLocaleString()}`;
                                if (k === 'squareFootage' && (typeof v === 'number' || Number(v) == v)) return `${v} sqft`;
                                if (k === 'lastSalePrice' && (typeof v === 'number' || Number(v) == v)) return `$${Number(v).toLocaleString()}`;
                                return v;
                              };
                              const taxAliases = { annualPropertyTaxes: ['taxAmount', 'TaxAmount', 'annual_property_taxes', 'propertyTax', 'annualTax', 'tax', 'totalTax'], assessedValue: ['taxAssessedValue', 'assessed_value', 'tax_assessed_value', 'assessmentValue', 'taxAssessment'] };
                              const resolveVal = (key, s) => {
                                let v = s[key];
                                if ((v === undefined || v === null || v === '') && taxAliases[key]) {
                                  for (const alt of taxAliases[key]) {
                                    const x = fullRecord?.[alt] ?? s[alt];
                                    if (x != null && x !== '') { v = x; break; }
                                  }
                                }
                                return v;
                              };
                              const rows = [];
                              for (const key of order) {
                                if (skip.has(key)) continue;
                                const v = resolveVal(key, src);
                                const val = formatVal(key, v);
                                if (val == null) continue;
                                rows.push({ key, label: formatLabel(key), value: val });
                              }
                              Object.keys(src || {}).filter((k) => !order.includes(k) && !skip.has(k)).sort().forEach((key) => {
                                const v = resolveVal(key, src) ?? src[key];
                                const val = formatVal(key, v);
                                if (val == null) return;
                                rows.push({ key, label: formatLabel(key), value: val });
                              });
                              if (rows.length === 0) {
                                const msg = propertyData?.warnings?.length
                                  ? propertyData.warnings[0]
                                  : 'No property details returned for this address. Try a different address or try again later.';
                                return (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                      {msg}
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                              return rows.map(({ key, label, value }) => (
                                <TableRow key={key} className="border-border hover:bg-accent/50">
                                  <TableCell className="font-medium text-muted-foreground align-top">{label}</TableCell>
                                  <TableCell className="text-foreground">
                                    <DetailValueCell value={value} />
                                  </TableCell>
                                </TableRow>
                              ));
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                      {propertyHistory.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                            <History className="w-4 h-4 text-primary" /> Property history
                          </h4>
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                  <TableHead className="text-muted-foreground font-medium">Date</TableHead>
                                  <TableHead className="text-muted-foreground font-medium">Price</TableHead>
                                  <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {propertyHistory.map((entry, i) => {
                                  const row = entry && typeof entry === 'object' ? entry : {};
                                  const date = row.saleDate ?? row.closeDate ?? row.date ?? row.lastSaleDate ?? '—';
                                  const price = row.price ?? row.salePrice ?? row.closePrice ?? row.lastSalePrice;
                                  const type = row.type ?? row.transactionType ?? '—';
                                  return (
                                    <TableRow key={i} className="border-border hover:bg-accent/50">
                                      <TableCell className="text-foreground">{typeof date === 'string' ? date.slice(0, 10) : String(date)}</TableCell>
                                      <TableCell className="font-medium text-foreground">{price != null ? `$${Number(price).toLocaleString()}` : '—'}</TableCell>
                                      <TableCell className="text-muted-foreground">{String(type)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Comps Section */}
            <Card className="bg-card border-border overflow-hidden shadow-sm">
              <CardHeader 
                className="cursor-pointer hover:bg-accent/50 transition-colors flex flex-row items-center justify-between gap-2"
                onClick={() => setIsCompsOpen(!isCompsOpen)}
              >
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="text-primary" /> Verified Recent Comps
                </CardTitle>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleRefreshComps}
                    disabled={compsRefreshing || !inputs?.address?.trim() || (String(inputs?.zipCode ?? '').replace(/\D/g, '').slice(0, 5).length !== 5)}
                    title="Refresh comps only"
                  >
                    {compsRefreshing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  {isCompsOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                </div>
              </CardHeader>
              <AnimatePresence>
                {isCompsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="text-muted-foreground font-medium">Address</TableHead>
                              <TableHead className="text-muted-foreground font-medium">Sale Price</TableHead>
                              <TableHead className="text-muted-foreground font-medium">Sqft</TableHead>
                              <TableHead className="text-muted-foreground font-medium">Beds/Baths</TableHead>
                              <TableHead className="text-muted-foreground font-medium">DOM</TableHead>
                              <TableHead className="text-muted-foreground font-medium">Sale Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentComps?.length > 0 ? (
                              recentComps.map((comp, i) => (
                                <TableRow key={i} className="border-border hover:bg-accent/50">
                                  <TableCell className="font-medium text-foreground">{comp.address}</TableCell>
                                  <TableCell className="text-green-600 font-bold">{comp.salePrice != null ? `$${Number(comp.salePrice).toLocaleString()}` : '—'}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.sqft}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.beds} / {comp.baths}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.dom}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.saleDate}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                  {propertyData?.warnings?.length
                                    ? propertyData.warnings.find((w) => typeof w === 'string' && w.toLowerCase().includes('comparable'))
                                      || propertyData.warnings[0]
                                    : 'No comparable sales found.'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PropertyIntelligenceSection;
