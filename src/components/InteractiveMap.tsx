/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ComparableListing, formatCurrency, GeoPoint } from '../../lib/calc';
import { Listing } from '../../lib/data';
import { MAP_ATTRIBUTION, MAP_TILE_URL } from '../../config/map';

interface InteractiveMapProps {
  pin: GeoPoint;
  searchRadiusMi: number;
  comparables: ComparableListing[];
  nonComparables?: Listing[];
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
  onPinChange,
  onDismissMapHint,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const homeMarkerRef = useRef<L.Marker | null>(null);
  const compLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const prevPinRef = useRef<string>('');

  // 1. Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Initialize with zoomControl: false so we can place it bottom-right
    const map = L.map(mapContainerRef.current, {
      center: [pin.lat, pin.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // Zoom control at bottom-right per design spec
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap tiles (config/map.ts), softened with CSS so the price pins stand out.
    L.tileLayer(MAP_TILE_URL, {
      maxZoom: 19,
      attribution: MAP_ATTRIBUTION,
    }).addTo(map);
    map.attributionControl.setPrefix(false);

    // Click map to reposition "My home" pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng }, 'click');
      if (onDismissMapHint) {
        onDismissMapHint();
      }
    });

    compLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Home Marker & Fit Bounds to Search Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentPinKey = `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)},${searchRadiusMi}`;
    const pinChanged = prevPinRef.current !== currentPinKey;
    prevPinRef.current = currentPinKey;

    // Home pin: round red marker with white house icon
    const homeIcon = L.divIcon({
      className: 'airbnb-home-marker',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #e11d48;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          user-select: none;
          transition: transform 0.15s ease;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
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

    // Fit map to search-radius circle around home pin (Leaflet fitBounds on circle's bounds, small padding)
    // Never zoom out to whole region. Do not draw circle on map.
    if (pinChanged) {
      const radiusMeters = Math.max(searchRadiusMi * 1609.34, 500); // at least 500m
      const bounds = L.latLng(pin.lat, pin.lng).toBounds(radiusMeters * 2);
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 16,
      });
    }
  }, [pin.lat, pin.lng, searchRadiusMi, onPinChange]);

  // 3. Update Price-Bubble Pins for Comparables Only
  useEffect(() => {
    const group = compLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    comparables.forEach((comp) => {
      const priceText = formatCurrency(Math.round(comp.effective_price));

      const bubbleIcon = L.divIcon({
        className: 'airbnb-rate-bubble',
        html: `
          <div style="
            background: #ffffff;
            color: #111827;
            font-size: 13px;
            font-weight: 700;
            font-family: inherit;
            padding: 5px 10px;
            border-radius: 9999px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.14);
            border: 1px solid rgba(0,0,0,0.06);
            cursor: pointer;
            transition: transform 0.15s ease, background 0.15s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            letter-spacing: normal;
            font-variant-numeric: tabular-nums;
          ">
            ${priceText}
          </div>
        `,
        iconSize: [60, 28],
        iconAnchor: [30, 14],
      });

      const marker = L.marker([comp.latitude, comp.longitude], {
        icon: bubbleIcon,
        zIndexOffset: 500,
      });

      // Small card on click: listing name, space type, bedrooms, $/night, rating. Nothing else.
      const bedroomsText =
        comp.bedrooms_clean !== null && comp.bedrooms_clean !== undefined
          ? comp.bedrooms_clean === 0
            ? 'Studio'
            : `${comp.bedrooms_clean} bed`
          : '';
      const spaceTypeText = comp.room_type === 'entire_home' ? 'Entire place' : 'Private room';
      const ratingText = comp.rating_overall
        ? `★ ${comp.rating_overall.toFixed(2)} (${comp.num_reviews || 0})`
        : '★ New';

      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; color: #1f2937; line-height: 1.4; padding: 2px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 3px; color: #111827;">
            ${comp.listing_name || 'DC Listing'}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
            ${spaceTypeText}${bedroomsText ? ` · ${bedroomsText}` : ''}
          </div>
          <div style="display: flex; items-center; justify-content: space-between; gap: 8px; font-size: 13px; border-top: 1px solid #f3f4f6; padding-top: 6px;">
            <strong style="color: #111827; font-variant-numeric: tabular-nums;">${priceText}/night</strong>
            <span style="color: #4b5563; font-size: 12px;">${ratingText}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 240 });
      group.addLayer(marker);
    });
  }, [comparables]);

  return (
    <div className="dc-map relative w-full h-full rounded-[28px] overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.10)] ring-1 ring-black/5 bg-[#f2efe9]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating label at the top: 'Explore rates near you' */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-gray-200/80 text-xs sm:text-sm font-semibold text-gray-900 pointer-events-auto">
          Explore rates near you
        </div>
      </div>
    </div>
  );
};
