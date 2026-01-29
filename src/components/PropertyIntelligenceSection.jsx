
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Calendar, Ruler, BedDouble, Bath, Car, Fan, Umbrella, GraduationCap, MapPin, DollarSign, ChevronDown, ChevronUp, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { validatePropertyInput } from "@/utils/validationUtils";
import { useToast } from "@/components/ui/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logDataFlow } from "@/utils/dataFlowDebug";
import { fetchPropertyIntelligence } from '@/services/edgeFunctionService';

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
  const [isSpecsOpen, setIsSpecsOpen] = useState(true);
  const [isCompsOpen, setIsCompsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    logDataFlow('PROPERTY_INTELLIGENCE_PROPS', { inputs, calculations, hasData: !!propertyData }, new Date());
  }, [inputs, calculations, propertyData]);

  const handleFetchIntelligence = async () => {
    setFetchError(null);
    logDataFlow('FETCH_PROPERTY_CLICK', { inputs }, new Date());

    // Validation
    const validation = validatePropertyInput(inputs?.address, inputs?.zipCode);
    
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
    
    const requestPayload = {
      address: inputs.address, 
      zipCode: inputs.zipCode, 
      propertyType: inputs.propertyType || "Single-Family", 
      arv: Number(inputs.arv) || 0
    };

    console.log('🤖 Claude request:', requestPayload);

    try {
      const data = await fetchPropertyIntelligence(
        requestPayload.address,
        requestPayload.zipCode,
        requestPayload.propertyType,
        requestPayload.arv
      );

      console.log('🤖 Claude response:', data);

      // Simple validation of response
      const requiredResponseFields = ['propertyType', 'yearBuilt', 'recentComps'];
      const missing = requiredResponseFields.filter(f => !data[f]);
      if (missing.length > 0) {
          logDataFlow('FETCH_RESPONSE_INVALID', missing, new Date());
          console.warn('Intelligence response missing fields:', missing);
      }

      if (data.recentComps) {
        console.log('🏘️ Parsed comps:', data.recentComps);
      } else {
        console.warn('⚠️ No comps found in response');
      }

      toast({
        title: "Success",
        description: "Property intelligence retrieved successfully.",
      });

      if (onPropertyDataFetch) {
        onPropertyDataFetch(data);
      }

    } catch (err) {
      console.error('❌ Comps error:', err);
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
              <h3 className="text-xl font-bold text-foreground mb-2">Enhance with AI Intelligence</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Instantly retrieve specs, taxes, school info, and verified comps using live market data via Claude AI.
              </p>
              <Button 
                onClick={handleFetchIntelligence} 
                disabled={!inputs?.address || inputs.address.length < 3}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]"
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
                <div className="flex items-center gap-2">
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                     onClick={(e) => { e.stopPropagation(); handleFetchIntelligence(); }}
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
