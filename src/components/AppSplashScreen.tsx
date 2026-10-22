import { useEffect, useState } from 'react';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export default function AppSplashScreen({ onFinish, minDurationMs = 2600 }: AppSplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const finishTimer = setTimeout(() => {
        onFinish?.();
      }, 550); // Smooth fade transition
      return () => clearTimeout(finishTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [onFinish, minDurationMs]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black select-none overflow-hidden transition-opacity duration-600 ease-out font-['Tajawal'] ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 45%, #0d0d0d 0%, #040404 60%, #000000 100%)',
      }}
    >
      {/* Ambient background particles & luxury gold glow */}
      <div
        className="absolute pointer-events-none rounded-full blur-3xl opacity-35 animate-pulse"
        style={{
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, rgba(180,135,30,0.15) 50%, transparent 75%)',
          animationDuration: '3s',
        }}
      />

      {/* Subtle outer breathing ring */}
      <div
        className="absolute pointer-events-none rounded-full border border-amber-500/20 animate-ping opacity-25"
        style={{
          width: '260px',
          height: '260px',
          animationDuration: '3.6s',
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* Animated Central Logo Container */}
        <div className="relative flex items-center justify-center group mb-6">
          {/* Backlight Glow Behind Logo */}
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-50"
            style={{
              background: 'radial-gradient(circle, rgba(230,190,70,0.5) 0%, transparent 70%)',
            }}
          />

          {/* Logo with gentle floating/scale animation & light sweep */}
          <div className="relative z-10 flex flex-col items-center animate-[pulse_3s_ease-in-out_infinite]">
            <div className="relative overflow-hidden rounded-2xl p-2 transition-transform duration-700 hover:scale-105">
              <img
                src="/header-logo.png"
                alt="جيبها - JIIBHA"
                className="w-56 sm:w-64 max-w-[80vw] h-auto object-contain drop-shadow-[0_4px_24px_rgba(212,175,55,0.45)] select-none pointer-events-none"
              />

              {/* Shimmer light sweep across the logo */}
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Brand Tagline in Luxury Gold Tone */}
        <div className="space-y-1 mb-8 animate-fadeIn">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-amber-200/80">
            بوابتك الموثوقة للاستيراد والتجارة
          </p>
          <div className="flex items-center justify-center gap-1.5 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="w-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </div>
        </div>

        {/* Elegant Bottom Loading Bar */}
        <div className="w-44 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 animate-[shimmer_1.6s_ease-in-out_infinite]"
            style={{
              width: '60%',
              boxShadow: '0 0 12px rgba(230,190,70,0.7)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
