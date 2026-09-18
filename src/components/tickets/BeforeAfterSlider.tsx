'use client';
import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MoveHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After (Resolved)',
}: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50); // 0-100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateSlider(e.clientX);
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    updateSlider(e.clientX);
  }, [updateSlider]);

  const onMouseUp = () => { isDragging.current = false; };

  const onTouchMove = (e: React.TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <MoveHorizontal className="w-4 h-4 text-gray-400" />
        Drag slider to compare before / after
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-video rounded-2xl overflow-hidden cursor-ew-resize select-none border border-gray-200 shadow-md"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchStart={e => updateSlider(e.touches[0].clientX)}
      >
        {/* AFTER image — full width underneath */}
        <div className="absolute inset-0">
          <img src={afterUrl} alt={afterLabel} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {afterLabel}
          </div>
        </div>

        {/* BEFORE image — clipped to left of slider */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={beforeUrl}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: `${containerRef.current?.clientWidth ?? 600}px` }}
            draggable={false}
          />
          <div className="absolute bottom-3 left-3 bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {beforeLabel}
          </div>
        </div>

        {/* Slider line + handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.2)]"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-xl border-2 border-white flex items-center justify-center">
            <MoveHorizontal className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
