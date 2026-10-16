import { useEffect, useState } from 'react';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export default function AppSplashScreen({ onFinish, minDurationMs = 3200 }: AppSplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const finishTimer = setTimeout(() => {
        onFinish?.();
      }, 400); // 400ms fade transition
      return () => clearTimeout(finishTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [onFinish, minDurationMs]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between items-center px-6 py-12 select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #0d214f 0%, #040c1e 55%, #02060f 100%)',
      }}
    >
      {/* Background starlight shimmer dots */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute w-1 h-1 bg-yellow-200 rounded-full top-[15%] left-[20%] animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-1.5 h-1.5 bg-yellow-100 rounded-full top-[25%] right-[18%] animate-pulse" style={{ animationDuration: '2.5s' }}></div>
        <div className="absolute w-1 h-1 bg-amber-300 rounded-full top-[65%] left-[15%] animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute w-1.5 h-1.5 bg-yellow-200 rounded-full top-[75%] right-[22%] animate-ping" style={{ animationDuration: '3.5s' }}></div>
        <div className="absolute w-1 h-1 bg-blue-200 rounded-full top-[40%] left-[82%] animate-pulse" style={{ animationDuration: '2.8s' }}></div>
        <div className="absolute w-1 h-1 bg-amber-200 rounded-full top-[50%] left-[12%] animate-pulse" style={{ animationDuration: '3.2s' }}></div>
      </div>

      {/* Top spacing */}
      <div className="w-full"></div>

      {/* Central Content */}
      <div className="flex flex-col items-center justify-center text-center relative z-10 w-full max-w-sm">
        {/* Animated Logo Container with Glowing Aura Rings */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Animated concentric rings around logo */}
          <div className="absolute w-44 h-44 rounded-full border border-amber-400/20 animate-ping opacity-60 pointer-events-none" style={{ animationDuration: '3.2s' }}></div>
          <div className="absolute w-56 h-56 rounded-full border border-yellow-300/15 animate-pulse pointer-events-none" style={{ animationDuration: '4s' }}></div>
          <div className="absolute w-64 h-64 rounded-full border border-yellow-500/10 pointer-events-none"></div>

          {/* Golden radial background glow behind the logo */}
          <div className="absolute w-40 h-40 bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-transparent rounded-full blur-2xl"></div>

          {/* Logo 3D Box with gentle floating/breathing animation */}
          <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 flex items-center justify-center animate-bounce-gentle">
            <img
              src="/app-logo.png"
              alt="JIIBHA Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_10px_25px_rgba(212,175,55,0.45)]"
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#fff2b2] via-[#e5c158] to-[#aa832a] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-serif mb-2">
          JIIBHA
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-medium tracking-wide text-amber-100/90 drop-shadow-sm mb-12 flex items-center justify-center gap-2">
          <span>تسوق، شحن ولوجستيات</span>
          <span className="text-amber-400/60 font-light">|</span>
          <span className="font-sans">Wholesale & Logistics</span>
        </p>

        {/* Animated Loading/Waiting Indicator (رمز الانتظار) */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Outer static subtle ring */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/20"></div>

            {/* Glowing spinning golden ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#ffe893] border-r-[#d4af37] animate-spin"
              style={{
                boxShadow: '0 0 16px rgba(230, 190, 70, 0.45)',
                animationDuration: '1.1s',
              }}
            ></div>

            {/* Inner soft pulse core */}
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300/40 to-amber-500/20 animate-pulse"></div>
          </div>

          {/* "يرجى الانتظار..." with animated dots */}
          <div className="flex items-center gap-1 text-sm font-bold text-amber-200/95 tracking-wide drop-shadow-sm">
            <span>يرجى الانتظار</span>
            <span className="inline-flex overflow-hidden">
              <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Branding (China to Algeria) */}
      <div className="relative z-10 text-center flex flex-col items-center gap-1.5 opacity-90">
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-gray-200 tracking-wide dir-ltr">
          <span className="text-amber-100/90 font-sans">From China to Algeria</span>
          <span className="inline-flex items-center gap-1 text-base">
            🇨🇳 <span className="text-amber-300 font-bold">➔</span> 🇩🇿
          </span>
          <span className="font-['Tajawal'] text-amber-100/90">من الصين إلى الجزائر</span>
        </div>
        <p className="text-xs text-amber-300/80 font-bold tracking-wider">
          منصتك للتوريد الآمن
        </p>
      </div>

      {/* Custom Keyframes embedded in component */}
      <style>{`
        @keyframes bounceGentle {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-6px) scale(1.02);
          }
        }
        .animate-bounce-gentle {
          animation: bounceGentle 3.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
