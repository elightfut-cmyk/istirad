import { useState, useEffect } from 'react';
import { appUpdateService, AppUpdateConfig } from '../services/appUpdateService';
import { isNativePlatform } from '../lib/onesignal';
import { Download, Sparkles, X, ShieldCheck } from 'lucide-react';

interface ForceUpdateModalProps {
  previewConfig?: AppUpdateConfig | null;
  onClosePreview?: () => void;
}

export default function ForceUpdateModal({ previewConfig, onClosePreview }: ForceUpdateModalProps) {
  const [config, setConfig] = useState<AppUpdateConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (previewConfig) {
      setConfig(previewConfig);
      setIsOpen(true);
      return;
    }

    const checkUpdate = async () => {
      try {
        const updateConfig = await appUpdateService.getConfig();
        if (!updateConfig || !updateConfig.isActive) {
          setIsOpen(false);
          return;
        }

        const isNative = isNativePlatform();
        // Target: Users who downloaded the app (Native Capacitor/Android) OR if admin enabled testing on web
        if (isNative || updateConfig.showOnWebForTesting) {
          setConfig(updateConfig);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Error checking for update:', err);
      }
    };

    checkUpdate();
  }, [previewConfig]);

  if (!isOpen || !config) return null;

  const handleDownloadAndInstall = () => {
    setDownloading(true);
    const downloadUrl = config.apkUrl || '/jibha-app.apk';

    try {
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        // In native Android WebView, open in system browser to handle APK download and installer package
        window.open(downloadUrl, '_system');
      } else {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'jibha-app.apk';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      window.location.href = downloadUrl;
    }

    setTimeout(() => {
      setDownloading(false);
    }, 3000);
  };

  const handleClose = () => {
    if (previewConfig) {
      setIsOpen(false);
      onClosePreview?.();
      return;
    }
    if (!config.isForced) {
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 flex items-center justify-between overflow-hidden">
          {/* Subtle circles in background */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-yellow-400/20 blur-xl"></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg shadow-indigo-900/30">
              <Download size={28} className="animate-bounce" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-gray-950 shadow-sm">
                <Sparkles size={11} />
                {config.isForced ? 'تحديث إجباري جديد' : 'تحديث متوفر'}
              </span>
              <p className="text-white/80 text-xs mt-1 font-medium">الإصدار v{config.version || '1.1.0'}</p>
            </div>
          </div>

          {/* Close button ONLY if previewing or not forced */}
          {(!config.isForced || previewConfig) && (
            <button
              onClick={handleClose}
              className="relative z-10 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
              title="إغلاق"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3">
            {config.title || 'تحديث جديد متوفر للتطبيق'}
          </h3>

          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 mb-5 text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {config.message}
          </div>

          <div className="flex items-center gap-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>تحديث رسمي موثوق وآمن لحماية بياناتك وتحسين تجربة استخدامك.</span>
          </div>

          {/* Action Button */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleDownloadAndInstall}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#4f46e5] to-indigo-600 hover:from-[#4338ca] hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all"
            >
              <Download size={20} className={downloading ? 'animate-spin' : ''} />
              <span>{downloading ? 'جاري بدء التحميل...' : 'تحميل وتثبيت التحديث الآن'}</span>
            </button>

            {(!config.isForced || previewConfig) && (
              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-semibold transition"
              >
                تخطي ومتابعة لاحقاً
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
