import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Users, DollarSign, School, ShoppingBag,
  TreePine, Navigation, RefreshCw, Sparkles, AlertTriangle,
  TrendingUp, ChevronDown, ChevronUp, Car,
  XCircle, Info, Map, Globe, Maximize2, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { fetchNeighborhoodIntelligence } from "@/services/edgeFunctionService";

/** Swap the static image size to a larger resolution for the lightbox. */
function toLargeUrl(url) {
  if (!url) return url;
  return url.replace(/size=\d+x\d+/, "size=1280x720");
}

const TrafficBadge = ({ risk, color }) => {
  const cls = {
    green:  "bg-green-500/20 text-green-400 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    red:    "bg-red-500/20 text-red-400 border-red-500/30",
    gray:   "bg-muted text-muted-foreground border-border",
  }[color] ?? "bg-muted text-muted-foreground border-border";
  const dotCls = {
    green: "bg-green-400", yellow: "bg-yellow-400",
    orange: "bg-orange-400", red: "bg-red-400", gray: "bg-muted-foreground",
  }[color] ?? "bg-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
      {risk}
    </span>
  );
};

const RatingDots = ({ rating }) => {
  const num = parseFloat(String(rating));
  const filled = Number.isFinite(num) ? Math.round(Math.min(10, Math.max(0, num))) : 0;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < filled ? "bg-primary" : "bg-muted-foreground/25"}`} />
      ))}
      {Number.isFinite(num) && <span className="text-xs text-muted-foreground ml-1">{num}/10</span>}
    </div>
  );
};

const Tag = ({ children }) => (
  <span className="inline-block bg-muted/60 text-foreground text-xs px-2.5 py-1 rounded-md border border-border/60">
    {children}
  </span>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="p-1.5 rounded-md bg-primary/10">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <h4 className="text-sm font-semibold text-foreground">{title}</h4>
  </div>
);

const DemandBadge = ({ level }) => {
  const cls = {
    "Very High": "bg-green-500/20 text-green-400 border-green-500/30",
    "High":      "bg-green-500/15 text-green-400 border-green-500/25",
    "Moderate":  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Low":       "bg-red-500/20 text-red-400 border-red-500/30",
  }[level] ?? "bg-muted text-muted-foreground border-border";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{level ?? "—"}</span>;
};

const InsightBlock = ({ text, icon: Icon, accent }) => {
  if (!text) return null;
  const cls = {
    blue:   "border-blue-500/30 bg-blue-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
    green:  "border-green-500/30 bg-green-500/5",
  }[accent] ?? "border-border bg-muted/30";
  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${cls}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
};

const ROAD_COLORS = {
  green:  { dot: "bg-green-400",          text: "text-green-400" },
  yellow: { dot: "bg-yellow-400",         text: "text-yellow-400" },
  orange: { dot: "bg-orange-400",         text: "text-orange-400" },
  red:    { dot: "bg-red-400",            text: "text-red-400" },
  gray:   { dot: "bg-muted-foreground",   text: "text-muted-foreground" },
};

const NeighborhoodIntelligenceCard = ({ inputs, propertyData, readOnly }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStreetView, setShowStreetView] = useState(true);
  const [schoolsExpanded, setSchoolsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxLabel, setLightboxLabel] = useState("");
  const { toast } = useToast();

  const openLightbox = useCallback((src, label) => {
    setLightboxSrc(toLargeUrl(src));
    setLightboxLabel(label);
    setLightboxOpen(true);
  }, []);

  const hasAddress = !!(inputs?.address && inputs?.zipCode);

  const fetchData = useCallback(async () => {
    if (!hasAddress) return;
    setLoading(true);
    setError(null);
    try {
      const lat = propertyData?.latitude ?? inputs?.lat;
      const lng = propertyData?.longitude ?? inputs?.lng;
      const result = await fetchNeighborhoodIntelligence(inputs.address, inputs.zipCode, {
        city:   inputs.city,
        state:  inputs.state,
        county: propertyData?.county ?? inputs?.county,
        lat:    lat != null ? Number(lat) : undefined,
        lng:    lng != null ? Number(lng) : undefined,
      });
      if (!result) throw new Error("No data returned from neighborhood service");
      setData(result);
    } catch (err) {
      setError(err.message);
      toast({ variant: "destructive", title: "Neighborhood data error", description: err.message });
    } finally {
      setLoading(false);
    }
  }, [inputs, propertyData, hasAddress, toast]);

  const nb  = data?.neighborhood ?? {};
  const loc = data?.location ?? {};
  const schoolList   = Array.isArray(nb.schools) ? nb.schools : [];
  const visibleSchools = schoolsExpanded ? schoolList : schoolList.slice(0, 3);
  const roadColors   = ROAD_COLORS[loc.trafficRiskColor] ?? ROAD_COLORS.gray;

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            Neighborhood &amp; Location Intelligence
          </CardTitle>
          {!readOnly && (
            <Button
              onClick={fetchData}
              disabled={loading || !hasAddress}
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              {loading
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Sparkles className="w-4 h-4 mr-2" />
              }
              {data ? "Refresh" : "Fetch Intelligence"}
            </Button>
          )}
        </div>
        {!hasAddress && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Address and ZIP required.
          </p>
        )}
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">

          {loading && (
            <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Globe className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground">Analyzing neighborhood...</p>
              <p className="text-xs text-muted-foreground/60">Querying road data and AI analysis</p>
            </motion.div>
          )}

          {!loading && error && (
            <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed to load neighborhood data</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          {!loading && !data && !error && (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No neighborhood data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Fetch Intelligence" to get county info, demographics, schools,
                  landmarks, shopping centers, road type and investor insights.
                </p>
              </div>
            </motion.div>
          )}

          {!loading && data && (
            <motion.div key="data" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="space-y-5">

              {/* Street View */}
              {(loc.streetViewUrl || loc.staticMapUrl) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <SectionHeader icon={Map} title="Street View" />
                    <div className="flex gap-1 mb-3">
                      <button onClick={() => setShowStreetView(true)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${showStreetView ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}>
                        Street
                      </button>
                      {loc.staticMapUrl && (
                        <button onClick={() => setShowStreetView(false)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${!showStreetView ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}>
                          Map
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="relative rounded-xl overflow-hidden border border-border bg-muted h-48 cursor-pointer group"
                    onClick={() => {
                      const src = showStreetView ? loc.streetViewUrl : loc.staticMapUrl;
                      const label = showStreetView ? "Street View" : "Map View";
                      openLightbox(src, label);
                    }}
                  >
                    <img
                      src={showStreetView ? loc.streetViewUrl : loc.staticMapUrl}
                      alt={showStreetView ? "Street View" : "Map View"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {inputs?.address}
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              {/* Road & Location */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <SectionHeader icon={Car} title="Road &amp; Location" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${roadColors.dot}`} />
                      <span className="text-sm font-medium text-foreground">{loc.roadTypeLabel ?? "Unknown"}</span>
                    </div>
                    {loc.roadName && (
                      <p className="text-xs text-muted-foreground">On <span className="font-medium text-foreground">{loc.roadName}</span></p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Traffic Risk:</span>
                      <TrafficBadge risk={loc.trafficRisk ?? "Unknown"} color={loc.trafficRiskColor ?? "gray"} />
                    </div>
                    {loc.roadDescription && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{loc.roadDescription}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {[
                      ["Speed Limit", loc.speedLimit],
                      ["Lanes", loc.lanes],
                      ["Sidewalk", loc.sidewalk],
                      ["Surface", loc.surface],
                      ["Neighborhood", loc.suburb],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {nb.roadImpactAssessment && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <InsightBlock text={nb.roadImpactAssessment} icon={Info} accent="orange" />
                  </div>
                )}
              </div>

              {/* County + Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <SectionHeader icon={MapPin} title="County" />
                  <p className="text-base font-semibold text-foreground">{nb.county ?? "—"}</p>
                  {nb.neighborhoodVibe && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{nb.neighborhoodVibe}</p>
                  )}
                </div>
                {nb.demographics && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <SectionHeader icon={Users} title="Demographics" />
                    <div className="space-y-1.5">
                      {[
                        ["Population", nb.demographics.population],
                        ["Median Age", nb.demographics.medianAge],
                        ["Median HH Income", nb.demographics.medianHouseholdIncome],
                        ["Owner Occupied", nb.demographics.ownerOccupied],
                        ["Renter Occupied", nb.demographics.renterOccupied],
                        ["Diversity", nb.demographics.diversityIndex],
                      ].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground text-right max-w-[55%]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Purchasing Power */}
              {nb.purchasingPower && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <SectionHeader icon={DollarSign} title="Purchasing Power" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Median Home Value", value: nb.purchasingPower.medianHomeValue },
                      { label: "Median Rent",        value: nb.purchasingPower.medianRent },
                      { label: "Affordability",      value: nb.purchasingPower.affordabilityRating },
                    ].filter(({ value }) => value).map(({ label, value }) => (
                      <div key={label} className="bg-background/60 rounded-lg p-3 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center flex-wrap gap-3 mt-3 pt-3 border-t border-border/50">
                    {nb.purchasingPower.buyerDemandLevel && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Buyer Demand:</span>
                        <DemandBadge level={nb.purchasingPower.buyerDemandLevel} />
                      </div>
                    )}
                    {nb.purchasingPower.investorActivity && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Investor Activity:</span>
                        <DemandBadge level={nb.purchasingPower.investorActivity} />
                      </div>
                    )}
                  </div>
                  {nb.purchasingPower.economicTrend && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">{nb.purchasingPower.economicTrend}</p>
                  )}
                </div>
              )}

              {/* Schools */}
              {schoolList.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <SectionHeader icon={School} title="Nearby Schools" />
                  <div className="space-y-2">
                    {visibleSchools.map((school, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-background/60 border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <School className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-foreground truncate">{school.name}</p>
                            <span className="text-xs text-muted-foreground shrink-0">{school.distance}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{school.type}</span>
                            {school.rating && school.rating !== "N/A" && (
                              <RatingDots rating={parseFloat(school.rating)} />
                            )}
                          </div>
                          {school.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">{school.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {schoolList.length > 3 && (
                    <button onClick={() => setSchoolsExpanded(v => !v)}
                      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                      {schoolsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {schoolsExpanded ? "Show fewer" : `Show ${schoolList.length - 3} more`}
                    </button>
                  )}
                </div>
              )}

              {/* Landmarks, Neighboring Towns, Shopping */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.isArray(nb.landmarks) && nb.landmarks.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <SectionHeader icon={TreePine} title="Landmarks" />
                    <div className="flex flex-wrap gap-1.5">{nb.landmarks.map((item, i) => <Tag key={i}>{item}</Tag>)}</div>
                  </div>
                )}
                {Array.isArray(nb.neighboringTowns) && nb.neighboringTowns.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <SectionHeader icon={Navigation} title="Neighboring Towns" />
                    <div className="flex flex-wrap gap-1.5">{nb.neighboringTowns.map((item, i) => <Tag key={i}>{item}</Tag>)}</div>
                  </div>
                )}
                {Array.isArray(nb.shoppingCenters) && nb.shoppingCenters.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <SectionHeader icon={ShoppingBag} title="Shopping Centers" />
                    <div className="flex flex-wrap gap-1.5">{nb.shoppingCenters.map((item, i) => <Tag key={i}>{item}</Tag>)}</div>
                  </div>
                )}
              </div>

              {/* Investor Insight */}
              {nb.investorInsight && (
                <InsightBlock text={nb.investorInsight} icon={TrendingUp} accent="green" />
              )}

              {/* Footer */}
              {data?.meta?.fetchedAt && (
                <div className="flex items-center justify-between text-xs text-muted-foreground/50 pt-2 border-t border-border/30">
                  <span>Sources: {data.meta.sources?.join(", ")}</span>
                  <span>Updated {new Date(data.meta.fetchedAt).toLocaleString()}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black border-border">
          <div className="relative">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {lightboxLabel && (
              <div className="absolute top-3 left-3 z-10 bg-black/70 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-sm font-medium">
                {lightboxLabel}
              </div>
            )}
            {lightboxSrc && (
              <img
                src={lightboxSrc}
                alt={lightboxLabel}
                className="w-full h-auto max-h-[80vh] object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            {inputs?.address && (
              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-sm">
                {inputs.address}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default NeighborhoodIntelligenceCard;
