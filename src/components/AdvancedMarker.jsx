import { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';
import { HAS_MAP_ID } from './GoogleMapsProvider';

/**
 * Hybrid marker component: uses AdvancedMarkerElement when a Map ID is
 * configured, otherwise falls back to the legacy google.maps.Marker so
 * the app works on localhost without extra Cloud Console setup.
 */
const AdvancedMarker = ({
  position,
  title,
  onClick,
  zIndex,
  pinBackground,
  pinBorderColor,
  pinGlyphColor = '#fff',
  pinGlyph,
  pinScale,
  label,
  icon,
}) => {
  const map = useGoogleMap();
  const markerRef = useRef(null);
  const listenerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    const useAdvanced =
      HAS_MAP_ID && !!window.google?.maps?.marker?.AdvancedMarkerElement;

    try {
      if (useAdvanced) {
        let content;
        if (pinBackground || pinGlyph != null || pinScale) {
          const opts = { glyphColor: pinGlyphColor };
          if (pinBackground) opts.background = pinBackground;
          if (pinBorderColor) opts.borderColor = pinBorderColor;
          if (pinScale) opts.scale = pinScale;
          // PinElement.glyph accepts: string, Element, or URL (not Text node)
          if (pinGlyph != null) {
            opts.glyph = typeof pinGlyph === 'string' ? pinGlyph : pinGlyph;
          }
          const pin = new window.google.maps.marker.PinElement(opts);
          content = pin.element;
        }

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: title || '',
          zIndex,
          ...(content ? { content } : {}),
        });

        markerRef.current = marker;
        if (onClick) {
          listenerRef.current = marker.addListener('click', onClick);
        }
      } else {
        const opts = { map, position, title: title || '', zIndex };
        if (label) opts.label = label;
        if (icon) {
          opts.icon = icon;
        } else if (pinBackground) {
          opts.icon = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: pinBackground,
            fillOpacity: 1,
            strokeColor: pinBorderColor || pinBackground,
            strokeWeight: 2,
            scale: (pinScale || 1) * 10,
          };
          if (pinGlyph) {
            opts.label = {
              text: String(pinGlyph),
              color: pinGlyphColor,
              fontWeight: 'bold',
              fontSize: '12px',
            };
          }
        }

        const marker = new window.google.maps.Marker(opts);
        markerRef.current = marker;
        if (onClick) {
          listenerRef.current = marker.addListener('click', onClick);
        }
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[AdvancedMarker] Could not create marker:', err?.message || err);
      }
    }

    return () => {
      if (listenerRef.current) {
        window.google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      if (markerRef.current) {
        if (useAdvanced) {
          markerRef.current.map = null;
        } else {
          markerRef.current.setMap(null);
        }
        markerRef.current = null;
      }
    };
  }, [
    map,
    position?.lat,
    position?.lng,
    title,
    onClick,
    zIndex,
    pinBackground,
    pinBorderColor,
    pinGlyphColor,
    pinGlyph,
    pinScale,
    label,
    icon,
  ]);

  return null;
};

export default AdvancedMarker;
