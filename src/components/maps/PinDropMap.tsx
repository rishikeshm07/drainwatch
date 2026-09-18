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
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const centerLat = lat ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT ?? '19.0760');
      const centerLng = lng ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG ?? '72.8777');

      const map = L.map(containerRef.current!, { center: [centerLat, centerLng], zoom: 14 });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 20 }
      ).addTo(map);

      // Custom drop pin icon
      const dropIcon = L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;background:#3b82f6;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3)"></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { icon: dropIcon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e) => {
          const pos = (e.target as import('leaflet').Marker).getLatLng();
          onPinDrop(pos.lat, pos.lng);
        });
      }

      map.on('click', (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        onPinDrop(newLat, newLng);

        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          markerRef.current = L.marker([newLat, newLng], { icon: dropIcon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', (ev) => {
            const pos = (ev.target as import('leaflet').Marker).getLatLng();
            onPinDrop(pos.lat, pos.lng);
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
    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-blue-300 bg-blue-50" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-blue-400">
          <MapPin className="w-8 h-8" />
          <span className="text-sm">Loading map…</span>
        </div>
      )}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
        Tap anywhere to drop pin
      </div>
    </div>
  );
}
