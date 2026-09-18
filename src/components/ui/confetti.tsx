'use client';
import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#a855f7','#ec4899','#ef4444'];

export function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas  = canvasRef.current;
    const ctx     = canvas.getContext('2d')!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn particles
    particles.current = Array.from({ length: 120 }, () => ({
      x:             Math.random() * canvas.width,
      y:             -20,
      vx:            (Math.random() - 0.5) * 6,
      vy:            Math.random() * 4 + 2,
      color:         COLORS[Math.floor(Math.random() * COLORS.length)],
      size:          Math.random() * 8 + 4,
      alpha:         1,
      rotation:      Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.1; // gravity
        p.rotation += p.rotationSpeed;
        p.alpha    -= 0.008;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      if (alive) frameRef.current = requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
}
