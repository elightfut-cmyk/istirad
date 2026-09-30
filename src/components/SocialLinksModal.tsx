import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { socialLinksAlertService, SocialLinksAlert } from '../services/socialLinksAlertService';
import { X, Send, Facebook, Check, Sparkles } from 'lucide-react';

interface SocialLinksModalProps {
  previewAlert?: SocialLinksAlert | null;
  onClosePreview?: () => void;
}

export default function SocialLinksModal({ previewAlert, onClosePreview }: SocialLinksModalProps) {
  const { user } = useAuthStore();
  const [alert, setAlert] = useState<SocialLinksAlert | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (previewAlert) {
      setAlert(previewAlert);
      setIsOpen(true);
      setTimeout(() => setAnimateIn(true), 50);
      return;
    }

    const checkAlert = async () => {
      // Only show to merchants and suppliers (not admins)
      if (!user || (user.role !== 'merchant' && user.role !== 'supplier')) {
        return;
      }

      const activeAlert = await socialLinksAlertService.getAlert();
      if (!activeAlert || !activeAlert.isActive) {
        return;
      }

      if (activeAlert.targetRole !== 'all' && activeAlert.targetRole !== user.role) {
        return;
      }

      const seen = socialLinksAlertService.hasUserSeenAlert(activeAlert.id, user.id);
      if (!seen) {
        const timer = setTimeout(() => {
          setAlert(activeAlert);
          setIsOpen(true);
          // slight delay for the mount before triggering the approach animation
          setTimeout(() => setAnimateIn(true), 50);
        }, 1000); // 1s after dashboard load
        return () => clearTimeout(timer);
      }
    };

    checkAlert();
  }, [user, previewAlert]);

  const handleClose = () => {
    if (previewAlert) {
      setAnimateIn(false);
      setTimeout(() => {
        setIsOpen(false);
        onClosePreview?.();
      }, 300);
      return;
    }

    setIsClosing(true);
    setAnimateIn(false);
    setTimeout(() => {
      if (alert && user) {
        socialLinksAlertService.markAlertAsSeen(alert.id, user.id);
      }
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleLinkClick = (url: string) => {
    if (!previewAlert && alert && user) {
      socialLinksAlertService.markAlertAsSeen(alert.id, user.id);
    }
    // We can choose to close it or keep it open. Let's close it after a slight delay
    setTimeout(() => {
      if (!previewAlert) {
         handleClose();
      }
    }, 500);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen || !alert) return null;

  return (
    <div 
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className={`relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          animateIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-8 opacity-0'
        }`}
        dir="rtl"
      >
        {/* Header Graphic */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-2 backdrop-blur-sm transition-all"
            >
              <X size={20} />
            </button>
          </div>
          <div className="relative z-10 flex gap-4 text-white">
             {alert.facebookUrl && (
               <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }}>
                 <Facebook size={32} />
               </div>
             )}
             {alert.telegramUrl && (
               <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2s' }}>
                 <Send size={32} />
               </div>
             )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 mb-4">
            <Sparkles size={14} />
            <span>مجتمع التجار</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
            {alert.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-sm">
            {alert.message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {alert.facebookUrl && (
              <button
                onClick={() => handleLinkClick(alert.facebookUrl)}
                className="w-full relative group overflow-hidden rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-3.5 px-6 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <Facebook size={20} />
                <span>اشترك في مجموعة الفيسبوك</span>
              </button>
            )}
            
            {alert.telegramUrl && (
              <button
                onClick={() => handleLinkClick(alert.telegramUrl)}
                className="w-full relative group overflow-hidden rounded-2xl bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold py-3.5 px-6 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <Send size={20} />
                <span>انضم إلى قناة التلغرام</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="mt-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ربما لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
