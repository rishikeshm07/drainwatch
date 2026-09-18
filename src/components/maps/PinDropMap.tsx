'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface PinDropMapProps {
  lat?: number | null;
  lng?: number | null;
  onPinDrop: (lat: number, lng: number) => void;
  height?: string;
}

export function PinDropMap({ lat, lng, onPinDrop, height = '300px' }: PinDropMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<import('leaflet').Map | null>(null);
  const markerRef    = useRef<import('leaflet').Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

      const centerLat = lat ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT ?? '10.8505');
      const centerLng = lng ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG ?? '76.2711');

      const map = L.map(containerRef.current!, { center: [centerLat, centerLng], zoom: 13 });

      // Satellite base
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri', maxZoom: 19 }
      ).addTo(map);

      // Labels overlay
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { attribution: '', maxZoom: 19, opacity: 0.85 }
      ).addTo(map);

      // Custom teardrop pin icon
      const dropIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;
          background:linear-gradient(135deg,#3b82f6,#06b6d4);
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          border:3px solid white;box-shadow:0 4px 12px rgba(59,130,246,0.5);
        "></div>`,
        iconSize:   [32, 32],
        iconAnchor: [16, 32],
      });

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { icon: dropIcon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', e => {
          const p = (e.target as import('leaflet').Marker).getLatLng();
          onPinDrop(p.lat, p.lng);
        });
      }

      map.on('click', e => {
        const { lat: newLat, lng: newLng } = e.latlng;
        onPinDrop(newLat, newLng);
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          markerRef.current = L.marker([newLat, newLng], { icon: dropIcon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', ev => {
            const p = (ev.target as import('leaflet').Marker).getLatLng();
            onPinDrop(p.lat, p.lng);
          });
        }
      });

      mapRef.current = map;
      setIsLoaded(true);
    };

    init();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-blue-400/40 shadow-lg" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-2 text-gray-300">
          <span className="text-2xl animate-spin">🛰️</span>
          <span className="text-sm">Loading satellite map…</span>
        </div>
      )}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
        📍 Tap map or drag pin to set exact location
      </div>
    </div>
  );
}
