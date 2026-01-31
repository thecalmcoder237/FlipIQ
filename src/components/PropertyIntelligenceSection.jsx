
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Calendar, Ruler, BedDouble, Bath, Car, Fan, Umbrella, GraduationCap, MapPin, DollarSign, ChevronDown, ChevronUp, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { validatePropertyInput } from "@/utils/validationUtils";
import { normalizePropertyIntelligenceResponse } from "@/utils/propertyIntelligenceSchema";
import { useToast } from "@/components/ui/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logDataFlow } from "@/utils/dataFlowDebug";
import { useAuth } from '@/contexts/AuthContext';
import { fetchPropertyIntelligence, getPropertyApiUsage } from '@/services/edgeFunctionService';

const SpecItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
    <div className="p-2 bg-primary/10 rounded-md">
      <Icon size={16} className="text-primary" />
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value || 'N/A'}</p>
    </div>
  </div>
);

const PropertyIntelligenceSection = ({ inputs, calculations, onPropertyDataFetch, propertyData }) => {
  const { currentUser } = useAuth();
  const [isSpecsOpen, setIsSpecsOpen] = useState(true);
  const [isCompsOpen, setIsCompsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [apiUsage, setApiUsage] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    logDataFlow('PROPERTY_INTELLIGENCE_PROPS', { inputs, calculations, hasData: !!propertyData }, new Date());
  }, [inputs, calculations, propertyData]);

  useEffect(() => {
    if (!currentUser?.id) return;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/d3874b50-fda2-4990-b7a4-de8818f92f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PropertyIntelligenceSection.jsx:useEffect',message:'calling getPropertyApiUsage',data:{userId:currentUser?.id?.slice(0,8)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    getPropertyApiUsage(currentUser.id)
      .then((data) => data && setApiUsage(data))
      .catch(() => {});
  }, [currentUser?.id]);

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

      const data = await fetchPropertyIntelligence(
        address,
        zipToSend,
        inputs.propertyType || "Single-Family",
        Number(inputs.arv) || 0,
        {
          formattedAddress: address,
          city: inputs.city || inputs.propertyIntelligence?.city,
          county: inputs.county || inputs.propertyIntelligence?.county,
          propertyId: inputs.propertyIntelligence?.propertyId,
          userId: currentUser?.id,
        }
      );

      console.log('🤖 Property intelligence response:', data);

      const normalized = normalizePropertyIntelligenceResponse(data || {});
      const compsDropped = Array.isArray(data?.recentComps) ? data.recentComps.length - (normalized.recentComps?.length || 0) : 0;
      if (compsDropped > 0) {
        logDataFlow('FETCH_COMPS_DROPPED', compsDropped, new Date());
        toast({
          title: "Success",
          description: `Property intelligence retrieved. ${compsDropped} comp(s) excluded due to missing data.`,
        });
      } else {
        toast({
          title: "Success",
          description: "Property intelligence retrieved successfully.",
        });
      }

      if (onPropertyDataFetch) {
        onPropertyDataFetch(normalized);
      }
      if (data?.usage && currentUser?.id) {
        setApiUsage({
          realie_count: data.usage.realie_count,
          rentcast_count: data.usage.rentcast_count,
          realie_limit: data.usage.realie_limit ?? 25,
          rentcast_limit: data.usage.rentcast_limit ?? 45,
        });
      }
    } catch (err) {
      console.error('❌ Property intelligence error:', err);
      logDataFlow('FETCH_ERROR', err.message, new Date());
      setFetchError(err.message || "Failed to fetch property data. Please try again.");
      toast({
        variant: "destructive",
        title: "Fetch Failed",
        description: err.message || "Failed to fetch property data."
      });
    } finally {
      setLoading(false);
    }
  };

  const hasData = !!propertyData;
  const { recentComps, ...specs } = propertyData || {};
  const realieAtLimit = apiUsage && apiUsage.realie_count >= (apiUsage.realie_limit ?? 25);
  const rentcastAtLimit = apiUsage && apiUsage.rentcast_count >= (apiUsage.rentcast_limit ?? 45);
  const fetchDisabled = realieAtLimit && rentcastAtLimit;

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
                Retrieve property specs (Realie.ai) and verified comparable sales (RentCast).
              </p>
              {apiUsage && (
                <p className="text-xs text-muted-foreground mb-2">
                  This month: Realie {apiUsage.realie_count}/{apiUsage.realie_limit ?? 25} · RentCast {apiUsage.rentcast_count}/{apiUsage.rentcast_limit ?? 45}
                </p>
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
                    <span>Error Fetching Intelligence</span>
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
                  <Building2 className="text-primary" /> Property Intelligence
                </CardTitle>
                <p className="text-xs text-muted-foreground absolute right-4 top-14">Property data from Realie.ai; comps from RentCast.</p>
                <div className="flex items-center gap-2">
                   {apiUsage && (
                     <span className="text-xs text-muted-foreground mr-2">
                       Realie {apiUsage.realie_count}/{apiUsage.realie_limit ?? 25} · RentCast {apiUsage.rentcast_count}/{apiUsage.rentcast_limit ?? 45}
                     </span>
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
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-0">
                      <SpecItem icon={Building2} label="Property Type" value={specs?.propertyType} />
                      <SpecItem icon={Calendar} label="Year Built" value={specs?.yearBuilt} />
                      <SpecItem icon={Ruler} label="Square Footage" value={specs?.squareFootage ? `${specs.squareFootage} sqft` : null} />
                      <SpecItem icon={BedDouble} label="Bedrooms" value={specs?.bedrooms} />
                      <SpecItem icon={Bath} label="Bathrooms" value={specs?.bathrooms} />
                      <SpecItem icon={Car} label="Garage" value={specs?.hasGarage ? specs.garageSize : 'None'} />
                      <SpecItem icon={Fan} label="HVAC" value={specs?.hvacType ? `${specs.hvacType} (${specs.hvacAge || '?'})` : null} />
                      <SpecItem icon={Umbrella} label="Roof" value={specs?.roofType ? `${specs.roofType} (${specs.roofAge || '?'})` : null} />
                      <SpecItem icon={GraduationCap} label="School District" value={specs?.schoolDistrict} />
                      <SpecItem icon={MapPin} label="Zoning" value={specs?.zoning} />
                      <SpecItem icon={MapPin} label="County" value={specs?.county} />
                      <SpecItem icon={DollarSign} label="Annual Taxes" value={specs?.annualPropertyTaxes ? `$${specs.annualPropertyTaxes.toLocaleString()}` : null} />
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Comps Section */}
            <Card className="bg-card border-border overflow-hidden shadow-sm">
              <CardHeader 
                className="cursor-pointer hover:bg-accent/50 transition-colors flex flex-row items-center justify-between"
                onClick={() => setIsCompsOpen(!isCompsOpen)}
              >
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="text-primary" /> Verified Recent Comps
                </CardTitle>
                {isCompsOpen ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
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
                                  <TableCell className="text-green-600 font-bold">${comp.salePrice?.toLocaleString()}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.sqft}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.beds} / {comp.baths}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.dom}</TableCell>
                                  <TableCell className="text-muted-foreground">{comp.saleDate}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                  No comparable sales found.
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
