import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { dashboardAlertService, DashboardAlert } from '../services/dashboardAlertService';
import { 
  Bell, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Check, 
  Sparkles,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardAlertModalProps {
  previewAlert?: DashboardAlert | null;
  onClosePreview?: () => void;
}

export default function DashboardAlertModal({ previewAlert, onClosePreview }: DashboardAlertModalProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<DashboardAlert | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // If in preview mode (used by admin in settings/notifications)
  useEffect(() => {
    if (previewAlert) {
      setAlert(previewAlert);
      setIsOpen(true);
      return;
    }

    // Normal production mode: check for user role and unread status
    const checkAlert = async () => {
      // Only show to merchants and suppliers (not admins on their own dashboard)
      if (!user || (user.role !== 'merchant' && user.role !== 'supplier')) {
        return;
      }

      const activeAlert = await dashboardAlertService.getAlert();
      if (!activeAlert || !activeAlert.isActive) {
        return;
      }

      // Check target audience
      if (activeAlert.targetRole !== 'all' && activeAlert.targetRole !== user.role) {
        return;
      }

      // Check if user has already seen this specific alert version
      const seen = dashboardAlertService.hasUserSeenAlert(activeAlert.id, user.id);
      if (!seen) {
        // Short subtle delay so the dashboard shell mounts smoothly before popping up
        const timer = setTimeout(() => {
          setAlert(activeAlert);
          setIsOpen(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    };

    checkAlert();
  }, [user, previewAlert]);

  const handleClose = () => {
    if (previewAlert) {
      setIsOpen(false);
      onClosePreview?.();
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      if (alert && user) {
        dashboardAlertService.markAlertAsSeen(alert.id, user.id);
      }
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const handleActionClick = () => {
    if (!alert?.buttonUrl) return;

    if (alert && user && !previewAlert) {
      dashboardAlertService.markAlertAsSeen(alert.id, user.id);
    }
    setIsOpen(false);

    if (alert.buttonUrl.startsWith('http://') || alert.buttonUrl.startsWith('https://')) {
      window.open(alert.buttonUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(alert.buttonUrl);
    }
  };

  if (!isOpen || !alert) return null;

  // Visual theming based on alertType
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />,
          badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          badgeText: 'تنبيه هام',
          headerBg: 'from-amber-500/15 via-orange-500/10 to-transparent',
          accentColor: 'text-amber-600 dark:text-amber-400',
          btnPrimary: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25',
          borderAccent: 'border-amber-500/30'
        };
      case 'urgent':
        return {
          icon: <AlertOctagon className="w-8 h-8 text-rose-600 animate-bounce" />,
          badgeBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          badgeText: 'تنبيه عاجل ومهم',
          headerBg: 'from-rose-600/15 via-red-600/10 to-transparent',
          accentColor: 'text-rose-600 dark:text-rose-400',
          btnPrimary: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25',
          borderAccent: 'border-rose-500/30'
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
          badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          badgeText: 'تحديث إيجابي',
          headerBg: 'from-emerald-500/15 via-teal-500/10 to-transparent',
          accentColor: 'text-emerald-600 dark:text-emerald-400',
          btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25',
          borderAccent: 'border-emerald-500/30'
        };
      case 'info':
      default:
        return {
          icon: <Bell className="w-8 h-8 text-[#4f46e5] dark:text-indigo-400" />,
          badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          badgeText: 'إشعار المنصة',
          headerBg: 'from-indigo-500/15 via-blue-500/10 to-transparent',
          accentColor: 'text-[#4f46e5] dark:text-indigo-400',
          btnPrimary: 'bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25',
          borderAccent: 'border-indigo-500/30'
        };
    }
  };

  const config = getTypeConfig(alert.alertType);

  const getTargetBadge = () => {
    switch (alert.targetRole) {
      case 'merchant':
        return 'موجه للتجار';
      case 'supplier':
        return 'موجه للموردين';
      case 'all':
      default:
        return 'لجميع مستخدمي المنصة';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className={`relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border ${config.borderAccent} dark:border-gray-700 overflow-hidden transform transition-all duration-200 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        dir="rtl"
      >
        {/* Top Gradient Wave Header */}
        <div className={`p-6 pb-4 bg-gradient-to-b ${config.headerBg} relative`}>
          {previewAlert && (
            <div className="absolute top-3 left-12 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              معاينة تجريبية
            </div>
          )}

          <button
            onClick={handleClose}
            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-700 rounded-full transition shadow-sm backdrop-blur-sm"
            title="إغلاق التنبيه"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-white dark:bg-gray-700/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600/50 shrink-0">
              {config.icon}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.badgeBg}`}>
                  <Sparkles size={12} />
                  {config.badgeText}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <Users size={12} />
                  {getTargetBadge()}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                {alert.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
          <div className="text-gray-700 dark:text-gray-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words font-medium">
            {alert.message}
          </div>
        </div>

        {/* Action & Dismiss Footer */}
        <div className="p-5 sm:p-6 pt-3 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/80 flex flex-col-reverse sm:flex-row items-center gap-3">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <Check size={16} />
            فهمت التنبيه، إغلاق
          </button>

          {alert.buttonText && alert.buttonUrl && (
            <button
              onClick={handleActionClick}
              className={`w-full sm:flex-1 px-6 py-3 rounded-xl font-bold text-sm text-white transition shadow-md flex items-center justify-center gap-2 ${config.btnPrimary}`}
            >
              <span>{alert.buttonText}</span>
              <ExternalLink size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
