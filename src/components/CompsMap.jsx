import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps, MAP_ID } from './GoogleMapsProvider';
import AdvancedMarker from './AdvancedMarker';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MAP_CONTAINER = { width: '100%', height: '100%' };

/**
 * Imperatively draw a dashed polyline so we avoid the @react-google-maps/api
 * <Polyline> component which can crash when icons use SVG path strings.
 */
function useDashedLine(map, from, to) {
  const lineRef = useRef(null);

  useEffect(() => {
    if (!map || !from || !to || !window.google) {
      if (lineRef.current) {
        lineRef.current.setMap(null);
        lineRef.current = null;
      }
      return;
    }

    const line = new window.google.maps.Polyline({
      path: [from, to],
      strokeColor: '#6366f1',
      strokeOpacity: 0.45,
      strokeWeight: 2,
      geodesic: true,
      map,
    });

    lineRef.current = line;

    return () => {
      line.setMap(null);
    };
  }, [map, from?.lat, from?.lng, to?.lat, to?.lng]);
}

function DashedLine({ map, from, to }) {
  useDashedLine(map, from, to);
  return null;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CompsMap = ({ subjectLat, subjectLng, subjectAddress, comps }) => {
  const { isLoaded } = useGoogleMaps();
  const [activeMarker, setActiveMarker] = useState(null);
  const mapRef = useRef(null);

  const subjectPos = subjectLat && subjectLng
    ? { lat: Number(subjectLat), lng: Number(subjectLng) }
    : null;

  const mappableComps = (comps || []).filter(
    (c) =>
      c.latitude != null &&
      c.longitude != null &&
      Number.isFinite(Number(c.latitude)) &&
      Number.isFinite(Number(c.longitude))
  );

  const [mapInstance, setMapInstance] = useState(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
    if (!window.google || !subjectPos) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(subjectPos);
    mappableComps.forEach((c) =>
      bounds.extend({ lat: Number(c.latitude), lng: Number(c.longitude) })
    );
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [subjectLat, subjectLng, mappableComps.length]);

  if (!isLoaded) {
    return (
      <Card className="bg-card border-border shadow-sm mb-4">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!subjectPos || mappableComps.length === 0) return null;

  return (
    <Card className="bg-card border-border shadow-sm mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" /> Comps Map
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Subject property and {mappableComps.length} comparable{mappableComps.length !== 1 ? 's' : ''} plotted by location
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl overflow-hidden border border-border h-[420px]">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={subjectPos}
            zoom={13}
            onLoad={onMapLoad}
            options={{
              ...(MAP_ID ? { mapId: MAP_ID } : {}),
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
              zoomControl: true,
            }}
          >
            {/* Subject marker -- orange pin */}
            <AdvancedMarker
              position={subjectPos}
              title={subjectAddress || 'Subject Property'}
              zIndex={1000}
              onClick={() => setActiveMarker('subject')}
              pinBackground="#f97316"
              pinBorderColor="#c2410c"
              pinGlyphColor="#fff"
              pinScale={1.3}
            />
            {activeMarker === 'subject' && (
              <InfoWindow position={subjectPos} onCloseClick={() => setActiveMarker(null)}>
                <div className="text-sm max-w-[220px]">
                  <p className="font-bold text-orange-600">Subject Property</p>
                  <p className="text-gray-700 mt-0.5">{subjectAddress || 'N/A'}</p>
                </div>
              </InfoWindow>
            )}

            {/* Comp markers + distance lines */}
            {mappableComps.map((comp, i) => {
              const compPos = { lat: Number(comp.latitude), lng: Number(comp.longitude) };
              const dist =
                comp.distance != null
                  ? Number(comp.distance)
                  : haversineDistance(
                      Number(subjectLat),
                      Number(subjectLng),
                      Number(comp.latitude),
                      Number(comp.longitude)
                    );
              return (
                <React.Fragment key={i}>
                  <AdvancedMarker
                    position={compPos}
                    title={comp.address || `Comp ${i + 1}`}
                    onClick={() => setActiveMarker(i)}
                    pinBackground="#3b82f6"
                    pinBorderColor="#1d4ed8"
                    pinGlyphColor="#fff"
                    pinGlyph={String(i + 1)}
                  />
                  <DashedLine map={mapInstance} from={subjectPos} to={compPos} />
                  {activeMarker === i && (
                    <InfoWindow position={compPos} onCloseClick={() => setActiveMarker(null)}>
                      <div className="text-sm max-w-[240px]">
                        <p className="font-bold text-blue-600">Comp {i + 1}</p>
                        <p className="text-gray-700 mt-0.5">{comp.address || 'N/A'}</p>
                        <div className="mt-1 space-y-0.5 text-gray-600 text-xs">
                          <p>
                            <span className="font-medium">Price:</span>{' '}
                            {(comp.salePrice ?? comp.price) != null
                              ? `$${Number(comp.salePrice ?? comp.price).toLocaleString()}`
                              : '—'}
                          </p>
                          <p>
                            <span className="font-medium">Distance:</span>{' '}
                            {dist != null ? `${dist.toFixed(2)} mi` : '—'}
                          </p>
                          {comp.sqft && (
                            <p>
                              <span className="font-medium">Sqft:</span> {comp.sqft.toLocaleString()}
                            </p>
                          )}
                          {(comp.beds ?? comp.bedrooms) && (
                            <p>
                              <span className="font-medium">Bed/Bath:</span>{' '}
                              {comp.beds ?? comp.bedrooms}/{comp.baths ?? comp.bathrooms}
                            </p>
                          )}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </React.Fragment>
              );
            })}
          </GoogleMap>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block ring-1 ring-orange-500/30" />
            Subject Property
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block ring-1 ring-blue-500/30" />
            Comparable Sale
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 border-t-2 border-dashed border-indigo-400 inline-block" />
            Distance
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompsMap;
