import { useEffect, useState, useRef } from 'react';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export default function AppSplashScreen({ onFinish, minDurationMs = 3200 }: AppSplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'glow' | 'exit'>('enter');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ─── Particle canvas (sparkles) ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; life: number; maxLife: number;
      color: string;
    }

    const particles: Particle[] = [];
    const colors = ['#FFD700','#FFC107','#FFECB3','#FFF8DC','#E8C84A','#F5E642'];
    let raf: number;

    const spawn = () => {
      const cx = canvas.width  / 2;
      const cy = canvas.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const dist  = 80 + Math.random() * 40;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -0.8 - Math.random() * 1.4,
        r: 1.5 + Math.random() * 2.5,
        life: 0,
        maxLife: 60 + Math.floor(Math.random() * 60),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame % 3 === 0) spawn();
      frame++;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
        if (p.life >= p.maxLife) particles.splice(i, 1);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ─── Animation phases ─── */
  useEffect(() => {
    // Phase 1: enter (logo scales + rotates in) → 700ms
    // Phase 2: glow pulse                       → hold
    // Phase 3: exit fade-out                    → 550ms before onFinish
    const t1 = setTimeout(() => setPhase('glow'), 700);
    const t2 = setTimeout(() => setPhase('exit'), minDurationMs - 550);
    const t3 = setTimeout(() => onFinish?.(), minDurationMs);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden
        transition-opacity duration-500 ease-out font-['Tajawal']
        ${phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #0c0b18 0%, #050414 55%, #000000 100%)',
      }}
    >
      {/* Sparkle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Outer ambient ring – breathing */}
      <div
        className="absolute rounded-full pointer-events-none animate-ping opacity-10"
        style={{
          width: 320, height: 320,
          border: '2px solid #D4AF37',
          animationDuration: '2.4s',
        }}
      />

      {/* Gold halo behind logo */}
      <div
        className="absolute rounded-full pointer-events-none blur-3xl opacity-40"
        style={{
          width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(212,175,55,0.55) 0%, rgba(180,130,20,0.2) 55%, transparent 75%)',
          animation: 'pulse 2.6s ease-in-out infinite',
        }}
      />

      {/* ── Central Logo Container ── */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{
          /* MBC3-style entrance: scale+rotate in then settle */
          animation: phase === 'enter'
            ? 'mbc3Enter 0.7s cubic-bezier(0.34,1.56,0.64,1) both'
            : phase === 'glow'
            ? 'mbc3Float 3s ease-in-out infinite'
            : 'none',
        }}
      >
        {/* ── Gold circular frame ── */}
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            padding: 4,
            background: 'conic-gradient(from 0deg, #8B6914, #FFD700, #F5E642, #D4AF37, #FFF8DC, #D4AF37, #8B6914, #FFD700, #8B6914)',
            boxShadow:
              '0 0 0 2px rgba(212,175,55,0.25), 0 0 28px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.25), inset 0 0 12px rgba(212,175,55,0.15)',
            animation: 'spinRing 8s linear infinite',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, #1a1630, #0a0818)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                animation: 'shimmerSweep 2.2s ease-in-out infinite',
                borderRadius: '50%',
              }}
            />

            {/* Logo image */}
            <img
              src="/app-logo.png"
              alt="Jiibha"
              style={{
                width: 108,
                height: 108,
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 16px rgba(212,175,55,0.5)) brightness(1.08)',
                position: 'relative',
                zIndex: 1,
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* App name */}
      <div
        className="relative z-10 mt-8 text-center"
        style={{
          animation: phase === 'enter' ? 'fadeSlideUp 0.6s 0.5s both' : undefined,
        }}
      >
        <p
          className="text-2xl font-black tracking-widest"
          style={{
            background: 'linear-gradient(90deg, #8B6914 0%, #FFD700 40%, #FFF8DC 60%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.18em',
          }}
        >
          JIIBHA
        </p>
        <p className="text-amber-200/60 text-xs mt-1 tracking-widest font-medium">
          بوابتك للاستيراد الموثوق
        </p>
      </div>

      {/* Gold loading bar */}
      <div
        className="relative z-10 mt-8 w-36 h-[3px] rounded-full overflow-hidden"
        style={{ background: 'rgba(212,175,55,0.15)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #8B6914, #FFD700, #FFF8DC, #FFD700, #8B6914)',
            backgroundSize: '200% 100%',
            animation: 'loadBar 2s ease-in-out infinite',
            boxShadow: '0 0 10px rgba(212,175,55,0.8)',
          }}
        />
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes mbc3Enter {
          0%   { transform: scale(0.1) rotate(-180deg); opacity: 0; filter: blur(8px); }
          60%  { transform: scale(1.15) rotate(8deg);  opacity: 1; filter: blur(0); }
          80%  { transform: scale(0.95) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes mbc3Float {
          0%, 100% { transform: translateY(0)    scale(1); }
          50%       { transform: translateY(-7px) scale(1.03); }
        }
        @keyframes spinRing {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-120%) rotate(135deg); }
          100% { transform: translateX(220%)  rotate(135deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loadBar {
          0%   { width: 0%;    background-position: 0% 50%;   }
          50%  { width: 100%;  background-position: 100% 50%; }
          100% { width: 0%;    background-position: 0% 50%;   }
        }
      `}</style>
    </div>
  );
}
