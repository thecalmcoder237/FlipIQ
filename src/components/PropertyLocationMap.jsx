import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, StreetViewPanorama } from '@react-google-maps/api';
import { useGoogleMaps, MAP_ID } from './GoogleMapsProvider';
import AdvancedMarker from './AdvancedMarker';
import { Map, Eye } from 'lucide-react';

const MAP_CONTAINER = { width: '100%', height: '100%' };

const MAP_OPTIONS = {
  disableDefaultUI: false,
  mapTypeControl: true,
  streetViewControl: true,
  zoomControl: true,
  fullscreenControl: true,
  ...(MAP_ID ? { mapId: MAP_ID } : {}),
};

const SV_OPTIONS = {
  enableCloseButton: false,
  addressControl: true,
  fullscreenControl: true,
  motionTracking: false,
};

const PropertyLocationMap = ({ lat, lng, address }) => {
  const { isLoaded } = useGoogleMaps();
  const [mode, setMode] = useState('map');
  const svMapRef = useRef(null);

  const center = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;

  const onSvMapLoad = useCallback((map) => {
    svMapRef.current = map;
  }, []);

  if (!isLoaded) {
    return (
      <div className="mb-5 rounded-xl overflow-hidden border border-border bg-muted h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!center) {
    if (!address) return null;
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    return (
      <div className="mb-5 rounded-xl overflow-hidden border border-border bg-muted h-64 relative">
        <iframe
          title="Property Location Map"
          src={embedUrl}
          className="w-full h-full"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none">
          {address}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-2">
      <div className="flex gap-1">
        <button
          onClick={() => setMode('map')}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 ${mode === 'map' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/60'}`}
        >
          <Map className="w-3 h-3" /> Map
        </button>
        <button
          onClick={() => setMode('street')}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 ${mode === 'street' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/60'}`}
        >
          <Eye className="w-3 h-3" /> Street View
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border bg-muted h-72 relative">
        {mode === 'map' ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={center}
            zoom={16}
            options={MAP_OPTIONS}
          >
            <AdvancedMarker
              position={center}
              title={address || 'Subject Property'}
              pinBackground="#f97316"
              pinBorderColor="#c2410c"
              pinGlyphColor="#fff"
            />
          </GoogleMap>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={center}
            zoom={16}
            onLoad={onSvMapLoad}
            options={{ disableDefaultUI: true, ...(MAP_ID ? { mapId: MAP_ID } : {}) }}
          >
            <StreetViewPanorama
              position={center}
              visible={true}
              options={SV_OPTIONS}
            />
          </GoogleMap>
        )}
        {address && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none z-10">
            {address}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyLocationMap;
