import { useEffect, useState } from 'react';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export default function AppSplashScreen({ onFinish, minDurationMs = 2800 }: AppSplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const finishTimer = setTimeout(() => {
        onFinish?.();
      }, 500); // 500ms smooth fade transition
      return () => clearTimeout(finishTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [onFinish, minDurationMs]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#040c1e] select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Container maintaining image aspect ratio without stretching */}
      <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center overflow-hidden">
        {/* The Exact Agreed Splash Screen Graphic */}
        <img
          src="/splash-screen.png"
          alt="JIIBHA Splash"
          className="w-full h-full object-cover select-none pointer-events-none"
        />

        {/* Animated Golden Aura Glow around the central Logo */}
        <div
          className="absolute pointer-events-none rounded-full blur-2xl animate-pulse"
          style={{
            top: '32%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(230,190,70,0.3) 0%, rgba(212,175,55,0.15) 50%, transparent 75%)',
            animationDuration: '2.8s',
          }}
        />

        {/* Animated Concentric Shimmer Ring around Logo */}
        <div
          className="absolute pointer-events-none rounded-full border border-amber-300/30 animate-ping opacity-40"
          style={{
            top: '32%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '150px',
            height: '150px',
            animationDuration: '3.2s',
          }}
        />

        {/* Dynamic Spinning Golden Ring overlaid on the Waiting Indicator */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            top: '72.8%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '82px',
            height: '82px',
          }}
        >
          {/* Subtle spinning accent glow */}
          <div
            className="w-full h-full rounded-full border-2 border-transparent border-t-[#fff3be] border-r-[#d4af37] animate-spin"
            style={{
              boxShadow: '0 0 18px rgba(230, 190, 70, 0.65)',
              animationDuration: '1.1s',
            }}
          />
        </div>
      </div>
    </div>
  );
}
