import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

interface Rune {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  pulsePhase: number;
  char: string;
}

const RUNE_CHARS = ['✦', '✧', '◈', '◇', '✶', '✷', '❂', '☉', '✩', '✫'];

export default function StarFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const starCount = Math.min(200, Math.floor((width * height) / 6000));
    const stars: Star[] = [];
    const particles: Particle[] = [];
    const runes: Rune[] = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.5 + 0.5,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    const particleCount = Math.min(30, Math.floor((width * height) / 30000));
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        hue: Math.random() * 40 + 190,
      });
    }

    const runeCount = 5;
    for (let i = 0; i < runeCount; i++) {
      runes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 15 + 10,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.003,
        opacity: Math.random() * 0.15 + 0.05,
        pulsePhase: Math.random() * Math.PI * 2,
        char: RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)],
      });
    }

    let frame = 0;

    function draw() {
      if (!ctx || !canvas) return;
      frame++;

      // Deep space gradient
      const gradient = ctx.createRadialGradient(
        width * 0.5, height * 0.4, 0,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(0.4, '#070a1a');
      gradient.addColorStop(1, '#03040d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Nebula glow
      const nebulaGradient = ctx.createRadialGradient(
        width * 0.3 + mouseRef.current.x * 30, height * 0.3 + mouseRef.current.y * 20, 0,
        width * 0.3, height * 0.3, width * 0.4
      );
      nebulaGradient.addColorStop(0, 'rgba(30, 60, 120, 0.08)');
      nebulaGradient.addColorStop(1, 'rgba(30, 60, 120, 0)');
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(0, 0, width, height);

      const nebulaGradient2 = ctx.createRadialGradient(
        width * 0.7 - mouseRef.current.x * 20, height * 0.6 - mouseRef.current.y * 15, 0,
        width * 0.7, height * 0.6, width * 0.35
      );
      nebulaGradient2.addColorStop(0, 'rgba(80, 50, 130, 0.05)');
      nebulaGradient2.addColorStop(1, 'rgba(80, 50, 130, 0)');
      ctx.fillStyle = nebulaGradient2;
      ctx.fillRect(0, 0, width, height);

      // Stars
      for (const s of stars) {
        const twinkle = Math.sin(frame * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
        const px = s.x + mouseRef.current.x * s.z * 20;
        const py = s.y + mouseRef.current.y * s.z * 15;
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${s.opacity * twinkle})`;
        ctx.fill();

        if (s.size > 1.2) {
          ctx.beginPath();
          ctx.arc(px, py, s.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 200, 255, ${s.opacity * twinkle * 0.15})`;
          ctx.fill();
        }
      }

      // Floating particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity * 0.1})`;
        ctx.fill();
      }

      // Floating runes
      for (const r of runes) {
        r.rotation += r.rotationSpeed;
        const pulse = Math.sin(frame * 0.01 + r.pulsePhase) * 0.3 + 0.7;
        const px = r.x + mouseRef.current.x * 10;
        const py = r.y + mouseRef.current.y * 8;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(r.rotation);
        ctx.font = `${r.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(150, 180, 255, ${r.opacity * pulse})`;
        ctx.fillText(r.char, 0, 0);
        ctx.restore();
      }

      // Smooth mouse parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      requestAnimationFrame(draw);
    }

    draw();

    function handleResize() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function handleMouseMove(e: MouseEvent) {
      mouseRef.current.targetX = (e.clientX / width - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / height - 0.5) * 2;
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
