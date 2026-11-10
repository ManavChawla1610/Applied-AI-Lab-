/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ComparableListing, formatCurrency, GeoPoint } from '../../lib/calc';
import { Listing } from '../../lib/data';
import { Navigation, Info, MousePointerClick } from 'lucide-react';

interface InteractiveMapProps {
  pin: GeoPoint;
  searchRadiusMi: number;
  comparables: ComparableListing[];
  nonComparables: Listing[];
  onPinChange: (newPin: GeoPoint, source: 'drag' | 'click' | 'address') => void;
  showMapPlacementHint?: boolean;
  onDismissMapHint?: () => void;
  selectedListingId?: number | null;
  onSelectListing?: (listing: ComparableListing | null) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pin,
  searchRadiusMi,
  comparables,
  nonComparables,
  onPinChange,
  showMapPlacementHint,
  onDismissMapHint,
  onSelectListing,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const homeMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const compLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const nonCompLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [, setActiveListing] = useState<ComparableListing | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [pin.lat, pin.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Click map to reposition "My home" pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng }, 'click');
      if (onDismissMapHint) {
        onDismissMapHint();
      }
    });

    // Create Layer Groups
    nonCompLayerGroupRef.current = L.layerGroup().addTo(map);
    compLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update "My Home" Pin and Search Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Radius circle (radius in meters: miles * 1609.34)
    const radiusMeters = searchRadiusMi * 1609.34;
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([pin.lat, pin.lng]);
      radiusCircleRef.current.setRadius(radiusMeters);
    } else {
      radiusCircleRef.current = L.circle([pin.lat, pin.lng], {
        radius: radiusMeters,
        color: '#e11d48',
        fillColor: '#f43f5e',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);
    }

    // "My Home" Custom Draggable DivIcon
    const homeIcon = L.divIcon({
      className: 'custom-home-pin',
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
          user-select: none;
        ">
          <div style="
            background: #222222;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 9999px;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 4px;
            border: 2px solid #ffffff;
            margin-bottom: 2px;
          ">
            <span>🏠 My home</span>
          </div>
          <div style="
            width: 14px;
            height: 14px;
            background: #e11d48;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [80, 42],
      iconAnchor: [40, 38],
    });

    if (homeMarkerRef.current) {
      homeMarkerRef.current.setLatLng([pin.lat, pin.lng]);
    } else {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: homeIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.on('dragend', (e: L.DragEndEvent) => {
        const markerTarget = e.target as L.Marker;
        const newPos = markerTarget.getLatLng();
        onPinChange({ lat: newPos.lat, lng: newPos.lng }, 'drag');
      });

      homeMarkerRef.current = marker;
    }
  }, [pin.lat, pin.lng, searchRadiusMi, onPinChange]);

  // Update Non-Comparable Dots
  useEffect(() => {
    const group = nonCompLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    nonComparables.forEach((listing) => {
      const dot = L.circleMarker([listing.latitude, listing.longitude], {
        radius: 3.5,
        fillColor: '#9ca3af',
        fillOpacity: 0.45,
        stroke: false,
      });

      dot.bindTooltip(`Listing not matching current space criteria`, {
        direction: 'top',
        className: 'text-xs',
      });

      group.addLayer(dot);
    });
  }, [nonComparables]);

  // Update Comparable Listings Price Bubbles
  useEffect(() => {
    const group = compLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    comparables.forEach((comp) => {
      const bubbleIcon = L.divIcon({
        className: 'custom-price-bubble',
        html: `
          <div style="
            background: #ffffff;
            color: #111827;
            font-size: 12px;
            font-weight: 700;
            font-family: ui-monospace, monospace;
            padding: 4px 8px;
            border-radius: 9999px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            border: 1px solid #e5e7eb;
            cursor: pointer;
            transition: transform 0.15s ease, background-color 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${formatCurrency(Math.round(comp.effective_price))}
          </div>
        `,
        iconSize: [52, 26],
        iconAnchor: [26, 13],
      });

      const marker = L.marker([comp.latitude, comp.longitude], {
        icon: bubbleIcon,
        zIndexOffset: 500,
      });

      // Privacy compliant popup: NO host names, host IDs, or host photos
      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; color: #1f2937; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #111827;">
            ${comp.listing_name || 'DC Listing'}
          </div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 8px;">
            ${comp.room_type === 'entire_home' ? 'Entire place' : 'Private room'}
            ${comp.bedrooms_clean !== null ? ` · ${comp.bedrooms_clean === 0 ? 'Studio' : comp.bedrooms_clean + ' bed'}` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 6px;">
            <div><strong>Listing price:</strong> ${formatCurrency(Math.round(comp.effective_price))}/night</div>
            <div><strong>Booking rate:</strong> ${Math.round(comp.ttm_adjusted_occupancy * 100)}% adjusted occupancy</div>
            <div><strong>12-mo revenue:</strong> ${formatCurrency(comp.ttm_revenue || 0)}/year</div>
            <div><strong>Rating:</strong> ★ ${comp.rating_overall ? comp.rating_overall.toFixed(2) : 'New'} (${comp.num_reviews || 0} reviews)</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on('click', () => {
        setActiveListing(comp);
        if (onSelectListing) {
          onSelectListing(comp);
        }
      });

      group.addLayer(marker);
    });
  }, [comparables, onSelectListing]);

  // Recenter map on pin
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([pin.lat, pin.lng], 15, { duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[450px] lg:h-full min-h-[380px] rounded-2xl overflow-hidden border border-gray-200 shadow-xs flex flex-col bg-gray-100">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Pill: "Explore rates near you" */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-full border border-gray-200/90 shadow-md flex items-center gap-2 text-xs font-semibold text-gray-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Explore rates near you</span>
          <span className="text-gray-400 font-normal">|</span>
          <span className="text-gray-500 font-mono font-medium">
            {comparables.length} comparables in {searchRadiusMi} mi
          </span>
        </div>
      </div>

      {/* Placement Hint Tooltip when "Use map instead" is invoked */}
      {showMapPlacementHint && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-gray-700">
            <MousePointerClick className="w-4 h-4 text-rose-400" />
            <span>Click the map to place your home</span>
          </div>
        </div>
      )}

      {/* Recenter button */}
      <button
        type="button"
        onClick={handleRecenter}
        className="absolute bottom-10 right-3 z-10 bg-white hover:bg-gray-50 text-gray-800 p-2 rounded-lg border border-gray-200 shadow-md transition-all active:scale-95 cursor-pointer"
        title="Recenter on My Home pin"
        aria-label="Recenter map"
      >
        <Navigation className="w-4 h-4 text-gray-700" />
      </button>

      {/* Instruction & Disclaimer Bar under Map */}
      <div className="absolute bottom-0 inset-x-0 z-10 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 border-t border-gray-200/90 text-[11px] text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">
            Pin locations are approximate — Airbnb does not publish exact addresses.
          </span>
        </div>
        <span className="shrink-0 text-gray-400 font-sans hidden sm:inline">
          Drag pin or click map to move
        </span>
      </div>
    </div>
  );
};
