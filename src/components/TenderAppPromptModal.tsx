import { useState, useEffect } from 'react';
import { tenderAppPromptService, TenderAppPromptConfig } from '../services/tenderAppPromptService';
import { isNativePlatform } from '../lib/onesignal';
import { Bell, CheckCircle2, Download, ArrowLeft, X } from 'lucide-react';

interface TenderAppPromptModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onProceed?: () => void;
  previewConfig?: TenderAppPromptConfig | null;
  onClosePreview?: () => void;
}

export default function TenderAppPromptModal({
  isOpen: controlledIsOpen,
  onClose,
  onProceed,
  previewConfig,
  onClosePreview,
}: TenderAppPromptModalProps) {
  const [config, setConfig] = useState<TenderAppPromptConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (previewConfig) {
      setConfig(previewConfig);
      setVisible(true);
      return;
    }

    if (controlledIsOpen === false) {
      setVisible(false);
      return;
    }

    const checkPrompt = async () => {
      // Don't show to users already running the native mobile app
      if (isNativePlatform()) {
        onProceed?.();
        return;
      }

      try {
        const fetchedConfig = await tenderAppPromptService.getConfig();
        if (!fetchedConfig || !fetchedConfig.isActive) {
          onProceed?.();
          return;
        }

        const seen = tenderAppPromptService.hasUserSeenPrompt(fetchedConfig.versionToken || 'v1');
        if (!seen) {
          setConfig(fetchedConfig);
          setVisible(true);
        } else {
          onProceed?.();
        }
      } catch (err) {
        console.error('Error in TenderAppPromptModal check:', err);
        onProceed?.();
      }
    };

    if (controlledIsOpen) {
      checkPrompt();
    }
  }, [controlledIsOpen, previewConfig]);

  if (!visible || !config) return null;

  const handleDismiss = () => {
    if (previewConfig) {
      setVisible(false);
      onClosePreview?.();
      return;
    }

    tenderAppPromptService.markPromptAsSeen(config.versionToken || 'v1');
    setVisible(false);
    onClose?.();
    onProceed?.();
  };

  const handleDownload = () => {
    setDownloading(true);
    if (!previewConfig) {
      tenderAppPromptService.markPromptAsSeen(config.versionToken || 'v1');
    }

    const downloadUrl = config.apkUrl || '/jiibha-app.apk';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'jiibha-app.apk';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setVisible(false);
      onClose?.();
      onProceed?.();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Graphic */}
        <div className="relative h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#4f46e5] p-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-lg"></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#061e47] border border-amber-400/40 p-1 flex items-center justify-center shadow-lg shadow-black/20 shrink-0">
              <img src="/app-logo.png" alt="Jiibha App" className="w-full h-full object-contain filter drop-shadow" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-emerald-800 shadow-xs">
                <Bell size={11} className="text-emerald-600" />
                تنبيهات فورية للمناقصات
              </span>
              <p className="text-white/95 text-xs mt-1 font-bold">تطبيق جيبها الرسمي (Jiibha)</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="relative z-10 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/15 transition"
            title="إغلاق ومتابعة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">
            {config.title || 'حمّل التطبيق لتصلك تنبيهات المناقصات فوراً!'}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5 whitespace-pre-line">
            {config.message}
          </p>

          {/* Quick Perks */}
          <div className="space-y-2.5 bg-gray-50 dark:bg-gray-750 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>إشعار فوري عند تقديم أي مورد لعرض سعر جديد</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>تنبيهات بالقبول والتفاوض حتى لو كان الهاتف مقفلاً</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>تتبع وتأكيد الشحنات خطوة بخطوة من الصين</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              <Download size={19} className={downloading ? 'animate-spin' : ''} />
              <span>{downloading ? 'جاري التحميل...' : config.buttonText || 'تحميل وتثبيت التطبيق الآن'}</span>
            </button>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <span>متابعة في المتصفح (تخطي لمرة واحدة)</span>
              <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
