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
}

declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

export function PublicMap({
  tickets,
  onTicketClick,
  selectedTicketId,
  height = '500px',
  interactive = true,
}: PublicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<Record<string, import('leaflet').Marker>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const centerLat = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT ?? '19.0760');
      const centerLng = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG ?? '72.8777');
      const zoom = parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM ?? '12');

      const map = L.map(mapContainerRef.current!, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap © CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      ).addTo(map);

      mapRef.current = map;
      setIsLoaded(true);
    };

    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Add/update markers whenever tickets change
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current!;

      // Remove old markers
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};

      tickets.forEach(ticket => {
        const color = MAP_PIN_COLORS[ticket.status];

        // Custom SVG circle pin
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:32px;height:32px;">
              <div style="
                position:absolute;inset:0;background:${color};border-radius:50%;
                border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
                display:flex;align-items:center;justify-content:center;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              ${ticket.status === 'escalated' ? `<div style="
                position:absolute;top:-4px;right:-4px;width:14px;height:14px;
                background:#a855f7;border-radius:50%;border:2px solid white;
                font-size:8px;color:white;display:flex;align-items:center;justify-content:center;
              ">!</div>` : ''}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([ticket.latitude, ticket.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:200px;padding:4px">
              <div style="font-size:11px;color:#6b7280;margin-bottom:4px">${ticket.ticket_number}</div>
              <div style="font-weight:600;font-size:14px;margin-bottom:6px">${ticket.title}</div>
              ${ticket.ai_severity_tag ? `<div style="font-size:11px;background:#f3f4f6;border-radius:6px;padding:3px 8px;display:inline-block;margin-bottom:6px">${ticket.ai_severity_tag}</div>` : ''}
              <div style="font-size:12px;color:#374151">
                ${ticket.address ?? `${ticket.latitude.toFixed(4)}, ${ticket.longitude.toFixed(4)}`}
              </div>
              <div style="margin-top:6px">
                <span style="
                  font-size:11px;font-weight:600;padding:2px 8px;border-radius:100px;
                  background:${color}22;color:${color};border:1px solid ${color}44;
                ">${ticket.status.replace('_',' ').toUpperCase()}</span>
              </div>
            </div>
          `);

        if (onTicketClick) {
          marker.on('click', () => onTicketClick(ticket));
        }

        markersRef.current[ticket.id] = marker;
      });
    };

    initMarkers();
  }, [tickets, isLoaded, onTicketClick]);

  // Pan to selected ticket
  useEffect(() => {
    if (!selectedTicketId || !mapRef.current) return;
    const ticket = tickets.find(t => t.id === selectedTicketId);
    if (ticket) {
      mapRef.current.setView([ticket.latitude, ticket.longitude], 15, { animate: true });
      markersRef.current[ticket.id]?.openPopup();
    }
  }, [selectedTicketId, tickets]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading map…</div>
        </div>
      )}
    </div>
  );
}
