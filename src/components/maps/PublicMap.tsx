'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MAP_PIN_COLORS } from '@/lib/utils';
import type { Ticket } from '@/types';

interface PublicMapProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
  selectedTicketId?: string | null;
  height?: string;
  interactive?: boolean;
  showHeatmap?: boolean;
}

export function PublicMap({
  tickets,
  onTicketClick,
  selectedTicketId,
  height = '500px',
  interactive = true,
  showHeatmap = false,
}: PublicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<import('leaflet').Map | null>(null);
  const markersRef      = useRef<Record<string, import('leaflet').Marker>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Init map ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;

      // Fix icon paths
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const centerLat = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT ?? '10.8505');
      const centerLng = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG ?? '76.2711');
      const zoom      = parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM ?? '8');

      const map = L.map(mapContainerRef.current!, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: interactive,
        dragging:    interactive,
        scrollWheelZoom: interactive,
      });

      // ── SATELLITE BASE LAYER (ESRI World Imagery — free, no key) ──
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles © Esri — Source: Esri, USGS, NOAA',
          maxZoom: 19,
        }
      ).addTo(map);

      // ── LABELS OVERLAY (so roads/places show on satellite) ─────────
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 19,
          opacity: 0.8,
        }
      ).addTo(map);

      mapRef.current = map;
      setIsLoaded(true);
    };

    init();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [interactive]);

  // ── Add/update markers ──────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const addMarkers = async () => {
      const L   = (await import('leaflet')).default;
      const map = mapRef.current!;

      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};

      tickets.forEach(ticket => {
        const color   = MAP_PIN_COLORS[ticket.status];
        const isPulse = ticket.status === 'open' || ticket.status === 'escalated';

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:36px;height:36px;">
              ${isPulse ? `<div style="
                position:absolute;inset:-4px;border-radius:50%;background:${color};
                opacity:0.25;animation:pulse-ring 1.5s ease-out infinite;
              "></div>` : ''}
              <div style="
                position:absolute;inset:0;background:${color};border-radius:50%;
                border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              ${ticket.status === 'escalated' ? `<div style="
                position:absolute;top:-4px;right:-4px;width:14px;height:14px;
                background:#a855f7;border-radius:50%;border:2px solid white;
                font-size:8px;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;
              ">!</div>` : ''}
            </div>`,
          iconSize:    [36, 36],
          iconAnchor:  [18, 36],
          popupAnchor: [0, -38],
        });

        const severityHtml = ticket.ai_severity_tag
          ? `<div style="margin:4px 0;font-size:11px;background:#f3f4f6;border-radius:6px;padding:3px 8px;display:inline-block;">${ticket.ai_severity_tag}</div>`
          : '';

        const marker = L.marker([ticket.latitude, ticket.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:210px;padding:4px">
              <div style="font-size:11px;color:#6b7280;margin-bottom:3px;">${ticket.ticket_number}</div>
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${ticket.title}</div>
              ${severityHtml}
              <div style="font-size:12px;color:#374151;margin-top:4px;">
                📍 ${ticket.address ?? `${ticket.latitude.toFixed(4)}, ${ticket.longitude.toFixed(4)}`}
              </div>
              <div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
                <span style="
                  font-size:11px;font-weight:600;padding:2px 10px;border-radius:100px;
                  background:${color}22;color:${color};border:1px solid ${color}44;
                ">${ticket.status.replace('_',' ').toUpperCase()}</span>
                ${ticket.ward_number ? `<span style="font-size:11px;color:#6b7280;">Ward ${ticket.ward_number}</span>` : ''}
              </div>
            </div>
          `, { maxWidth: 260 });

        if (onTicketClick) marker.on('click', () => onTicketClick(ticket));
        markersRef.current[ticket.id] = marker;
      });
    };

    addMarkers();
  }, [tickets, isLoaded, onTicketClick]);

  // ── Pan to selected ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedTicketId || !mapRef.current) return;
    const t = tickets.find(x => x.id === selectedTicketId);
    if (t) {
      mapRef.current.setView([t.latitude, t.longitude], 15, { animate: true });
      markersRef.current[t.id]?.openPopup();
    }
  }, [selectedTicketId, tickets]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-700 shadow-lg" style={{ height }}>
      {/* Satellite badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
        🛰️ Satellite View
      </div>
      <div ref={mapContainerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <span className="animate-spin">🛰️</span> Loading satellite imagery…
          </div>
        </div>
      )}
    </div>
  );
}
