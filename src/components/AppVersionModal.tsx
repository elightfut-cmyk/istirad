import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface UpdateInfo {
  currentVersionCode: number;
  currentVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  apkUrl: string;
}

interface AppVersionModalProps {
  previewMode?: boolean;
  previewData?: Partial<UpdateInfo>;
  onClosePreview?: () => void;
}

export default function AppVersionModal({ previewMode, previewData, onClosePreview }: AppVersionModalProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // If preview mode is requested from admin panel
    if (previewMode) {
      setUpdateInfo({
        currentVersionCode: previewData?.currentVersionCode || 1,
        currentVersionName: previewData?.currentVersionName || '1.0.0',
        latestVersionCode: previewData?.latestVersionCode || 2,
        latestVersionName: previewData?.latestVersionName || '2.0.0',
        apkUrl: previewData?.apkUrl || 'https://example.com/app.apk',
      });
      setIsOpen(true);
      return;
    }

    const checkAppVersion = async () => {
      try {
        // 1. Check Environment: Only run in native mobile environment (Capacitor)
        // Allow URL param ?test_update=true for developer testing on web
        const isNative = Capacitor.isNativePlatform();
        const isTestingParam = typeof window !== 'undefined' && window.location.search.includes('test_update=true');

        if (!isNative && !isTestingParam) {
          return;
        }

        // 2. Extract local app version using @capacitor/app
        let currentVersionCode = 1;
        let currentVersionName = '1.0.0';

        if (isNative) {
          try {
            const appInfo = await CapApp.getInfo();
            // In Android Capacitor: build is the versionCode (e.g. 1, 2, 100), version is versionName (e.g. 1.0.0)
            const parsedCode = parseInt(appInfo.build, 10);
            if (!isNaN(parsedCode) && parsedCode > 0) {
              currentVersionCode = parsedCode;
            }
            if (appInfo.version) {
              currentVersionName = appInfo.version;
            }
          } catch (appErr) {
            console.warn('Could not read Capacitor App info:', appErr);
          }
        }

        // 3. Update current user's installed version in Supabase users table
        if (user?.id) {
          try {
            await supabase
              .from('users')
              .update({ current_app_version: currentVersionCode })
              .eq('id', user.id);
          } catch (e) {
            console.warn('Notice: Failed updating current_app_version in users table:', e);
          }
        }

        // 4. Fetch latest version from app_settings table
        const { data: settings, error: settingsError } = await supabase
          .from('app_settings')
          .select('latest_version_code, latest_version_name, apk_download_url')
          .eq('id', 1)
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching app_settings:', settingsError);
          return;
        }

        if (!settings) {
          return;
        }

        const latestCode = Number(settings.latest_version_code) || 1;

        // 5. Compare versions: Show modal if local versionCode is smaller than server
        if (currentVersionCode < latestCode || isTestingParam) {
          setUpdateInfo({
            currentVersionCode,
            currentVersionName,
            latestVersionCode: latestCode,
            latestVersionName: settings.latest_version_name || String(latestCode),
            apkUrl: settings.apk_download_url || '',
          });
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Error in checkAppVersion:', err);
      }
    };

    checkAppVersion();
  }, [user?.id, previewMode, previewData]);

  if (!isOpen || !updateInfo) {
    return null;
  }

  const handleDownload = async () => {
    if (!updateInfo.apkUrl) return;
    setDownloading(true);

    try {
      // Check Capacitor Browser plugin if available on window or dynamic import
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.Browser?.open) {
        await cap.Plugins.Browser.open({ url: updateInfo.apkUrl });
      } else {
        // Fallback to window.open with _system for Android APK installer handling
        window.open(updateInfo.apkUrl, '_system');
      }
    } catch (e) {
      console.warn('Opening download URL directly fallback:', e);
      try {
        window.open(updateInfo.apkUrl, '_system');
      } catch {
        window.location.href = updateInfo.apkUrl;
      }
    } finally {
      setTimeout(() => setDownloading(false), 3000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      // Mandatory modal: clicking the backdrop does NOT close the modal
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-emerald-400/20 blur-xl"></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#061e47] border border-emerald-400/50 p-1 flex items-center justify-center shadow-lg shadow-black/20 shrink-0">
              <img src="/app-logo.png" alt="Jiibha Logo" className="w-full h-full object-contain filter drop-shadow" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-gray-950 shadow-sm">
                <Sparkles size={11} />
                تحديث إجباري جديد
              </span>
              <p className="text-white/95 text-xs mt-1 font-bold">
                منصة جيبها (Jiibha Platform)
              </p>
            </div>
          </div>

          {previewMode && onClosePreview && (
            <button
              onClick={onClosePreview}
              className="relative z-10 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition text-xs font-bold border border-white/20"
            >
              إغلاق المعاينة
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3 leading-snug">
            🚀 تحديث جديد متوفر للمنصة!
          </h3>

          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
            أطلقنا نسخة جديدة تتضمن تحسينات هامة لتسريع عملك وضمان استقرار الطلبيات. يرجى التحديث لمواصلة استخدام التطبيق.
          </p>

          {/* Small Details Badge */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-4 py-2.5 mb-5 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>(إصدارك الحالي: {updateInfo.currentVersionCode} | الإصدار المطلوب: {updateInfo.latestVersionCode})</span>
          </div>

          <div className="flex items-center gap-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>تحديث رسمي موثوق وآمن لحماية حسابك واستقرار الصفقات.</span>
          </div>

          {/* Wide Emerald-600 Action Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-75 cursor-pointer"
          >
            <Download size={20} className={downloading ? 'animate-bounce' : ''} />
            <span>{downloading ? 'جاري فتح رابط التحميل...' : 'تحميل التحديث الآن'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
